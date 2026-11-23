const db = require('../config/db');
const { EXPENSE_CATEGORIES } = require('../domain/expenseCategories');
const { encryptField, decryptField } = require('../utils/fieldCrypto');

/** Allowed expense categories (must match frontend CATEGORY_KEYS / i18n). */
const CATEGORY_ENUM = `ENUM(${EXPENSE_CATEGORIES.map((category) => `'${category}'`).join(', ')})`;

// Create expenses table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS expenses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description_enc TEXT NOT NULL,
    description_iv VARCHAR(32) NOT NULL,
    enc_v INT NOT NULL DEFAULT 1,
    category ${CATEGORY_ENUM} NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (amount >= 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Initialize the table
const initTable = async () => {
  try {
    await db.query(createTableQuery);
    // Expand ENUM on existing DBs (CREATE IF NOT EXISTS does not alter columns)
    await db.query(
      `ALTER TABLE expenses MODIFY COLUMN category ${CATEGORY_ENUM} NOT NULL`
    );

    // MIG-05 Phase B removed the legacy plaintext column and renamed temp_*.
    // Fail loudly instead of silently returning empty descriptions if the
    // application starts against an unmigrated database.
    const legacyRows = await db.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'expenses'
          AND column_name IN ('description', 'temp_description_enc', 'temp_description_iv')`
    );
    if (legacyRows.length > 0) {
      throw new Error(
        `MIG-05 Phase B schema is not applied (found ${legacyRows
          .map((row) => row.column_name)
          .join(', ')}). Run scripts/apply-mig05-phase-b.js first.`
      );
    }

    const requiredRows = await db.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'expenses'
          AND column_name IN ('description_enc', 'description_iv', 'enc_v')`
    );
    if (requiredRows.length !== 3) {
      throw new Error(
        `expenses is missing MIG-05 Phase B columns (found ${requiredRows
          .map((row) => row.column_name)
          .join(', ') || 'none'}).`
      );
    }

    // RPT-01: index for date-range aggregation/listing. MySQL has no
    // CREATE INDEX IF NOT EXISTS, so check first (idempotent on every boot).
    try {
      const idxRows = await db.query(
        `SELECT 1 FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = 'expenses'
           AND index_name = 'idx_expenses_user_date'`
      );
      if (!idxRows || idxRows.length === 0) {
        await db.query('CREATE INDEX idx_expenses_user_date ON expenses (user_id, `date`)');
      }
    } catch (idxErr) {
      console.warn('⚠️ Could not ensure expenses date index:', idxErr.message);
    }
    console.log('✅ Expenses table is ready');
  } catch (err) {
    console.error('❌ Error creating expenses table:', err.message);
    throw err;
  }
};

// Call the initialization
initTable().catch(console.error);

class Expense {
  /**
   * MIG-05 Phase B resolver: decrypt description_enc/description_iv only.
   * There is no plaintext fallback. Missing/corrupt ciphertext is logged and
   * returned as an empty string so one bad row cannot break a whole page.
   */
  static resolveDescription(row) {
    if (!row) return '';

    if (
      Number(row.enc_v) !== 1 ||
      !row.description_enc ||
      !row.description_iv
    ) {
      console.error('Expense has no encrypted description for id:', row.id);
      return '';
    }

    try {
      return decryptField(row.description_enc, row.description_iv);
    } catch (err) {
      console.error('Expense decrypt failed for id:', row.id, '-', err.message);
      return '';
    }
  }

  /** Strip encryption material so ciphertext/IV never leave the API (ENC-01). */
  static stripCryptoMaterial(obj) {
    if (obj && typeof obj === 'object') {
      delete obj.description_enc;
      delete obj.description_iv;
      delete obj.enc_v;
    }
    return obj;
  }

  /**
   * Encrypted-write envelope (MIG-05): returns { enc, iv, encV } for the text.
   * Fail-closed in every environment — a missing/invalid ENC_KEY throws rather
   * than falling back to legacy plaintext.
   */
  static encryptDescription(description) {
    const { enc, iv } = encryptField(description);
    return { enc, iv, encV: 1 };
  }

  constructor(expenseData = {}) {
    this.id = expenseData.id || null;
    this.userId = expenseData.userId || expenseData.user_id || null;
    this.amount = expenseData.amount || 0;
    this.description =
      expenseData.description_enc || expenseData.description_iv
        ? Expense.resolveDescription(expenseData) || ''
        : expenseData.description || '';
    this.category = expenseData.category || '';
    this.date = expenseData.date || new Date().toISOString();
  }

  // Save the current expense instance
  async save(callback) {
    try {
      if (this.id) {
        // Update existing expense (MIG-05 Phase B: encrypted storage only).
        const cryptoEnv = Expense.encryptDescription(this.description);
        const sql = `
          UPDATE expenses 
          SET amount = ?, 
              description_enc = ?,
              description_iv = ?,
              enc_v = ?,
              category = ?, 
              date = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        
        const params = [
          this.amount,
          cryptoEnv.enc,
          cryptoEnv.iv,
          cryptoEnv.encV,
          this.category,
          this.date,
          this.id
        ];
        
        // Dev-only: full params (amount/description) stay out of prod logs (LOG-01).
        // Enable locally with NODE_ENV=development when debugging.
        if (process.env.NODE_ENV === 'development') {
          console.log('Updating expense, id:', this.id);
        }

        const result = await db.query(sql, params);
        
        // Fetch the updated record
        if (result.affectedRows > 0) {
          const rows = await db.query('SELECT * FROM expenses WHERE id = ?', [this.id]);
          if (rows.length > 0) {
            Object.assign(this, rows[0]);
            this.description = Expense.resolveDescription(rows[0]);
            Expense.stripCryptoMaterial(this);
          }
          callback(null, this);
        } else {
          callback(new Error('No expense found with the given ID'));
        }
      } else {
        // Create new expense (MIG-05 Phase B: encrypted storage only).
        const cryptoEnv = Expense.encryptDescription(this.description);
        const sql = `
          INSERT INTO expenses (user_id, amount, description_enc, description_iv, enc_v, category, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          this.userId,
          this.amount,
          cryptoEnv.enc,
          cryptoEnv.iv,
          cryptoEnv.encV,
          this.category,
          this.date
        ];
        
        // Dev-only (see above): never log description/amount in production.
        if (process.env.NODE_ENV === 'development') {
          console.log('Inserting new expense for user:', this.userId);
        }

        const result = await db.query(sql, params);
        
        if (result.insertId) {
          this.id = result.insertId;
          // Fetch the newly created record
          const rows = await db.query('SELECT * FROM expenses WHERE id = ?', [this.id]);
          if (rows.length > 0) {
            Object.assign(this, rows[0]);
            this.description = Expense.resolveDescription(rows[0]);
            Expense.stripCryptoMaterial(this);
          }
          console.log('Expense saved successfully with ID:', this.id);
          callback(null, this);
        } else {
          throw new Error('Failed to insert expense');
        }
      }
    } catch (err) {
      // Never log params/stack with user data; message only (LOG-01).
      console.error('Error in save method:', err.message);
      callback(err);
    }
  }

  // Static method to find an expense by ID
  static async findById(id, callback) {
    try {
      const rows = await db.query('SELECT * FROM expenses WHERE id = ?', [id]);
      if (rows.length === 0) return callback(null, null);
      callback(null, new Expense(rows[0]));
    } catch (err) {
      callback(err);
    }
  }

  // Get all expenses for a user
  static async findByUser(userId, callback) {
    try {
      const rows = await db.query(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', 
        [userId]
      );
      callback(null, rows);
    } catch (err) {
      callback(err);
    }
  }

  // Get expenses by category for a user
  static async getByCategory(userId, callback) {
    try {
      const rows = await db.query(
        'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category', 
        [userId]
      );
      callback(null, rows);
    } catch (err) {
      callback(err);
    }
  }

  // Update an existing expense
  static updateById(id, updateData, callback) {
    const expense = new Expense({...updateData, id});
    expense.save(callback);
  }

  // Delete an expense
  static async deleteById(id, callback) {
    try {
      const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
      callback(null, { 
        success: result.affectedRows > 0, 
        changes: result.affectedRows 
      });
    } catch (err) {
      callback(err);
    }
  }

  // Get monthly summary for a user
  static async getMonthlySummary(userId, year = null, month = null, callback) {
    try {
      console.log('Getting monthly summary for user:', userId, 'year:', year, 'month:', month);
  
      // Base SQL
      let sql = `
        SELECT 
          MONTH(date) AS month,  -- month (1-12)
          YEAR(date) AS year,    -- year (e.g., 2025)
          SUM(amount) AS total,  -- total expenses
          COUNT(*) AS count      -- number of records
        FROM expenses 
        WHERE user_id = ?
      `;
  
      const params = [userId];
      
      // Optional filters
      if (year) {
        sql += ' AND YEAR(date) = ?';
        params.push(year);
      }
      if (month) {
        sql += ' AND MONTH(date) = ?';
        params.push(month);
      }
  
      sql += `
        GROUP BY YEAR(date), MONTH(date)
        ORDER BY year DESC, month DESC
      `;
  
      const rows = await db.query(sql, params);
      callback(null, rows);
    } catch (error) {
      console.error('Error in getMonthlySummary:', error);
      callback(error);
    }
  }

  // Get recent expenses for a user
  static async getRecent(userId, limit = 5, callback) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC LIMIT ?', 
        [userId, limit]
      );
      callback(null, rows);
    } catch (err) {
      callback(err);
    }
  }

  // Get daily expenses for a specific month
  static async getDailyExpenses(userId, year, month, callback) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
      
      // For MySQL, we'll use a different approach with a numbers table
      const rows = await db.query(
        `SELECT 
          day_of_month AS day,
          COALESCE(SUM(amount), 0) AS total
        FROM (
          SELECT 1 AS day_of_month UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
          SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
          SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
          SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION
          SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
          SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
          SELECT 31
        ) AS days
        LEFT JOIN expenses ON 
          DAY(expenses.date) = days.day_of_month AND
          MONTH(expenses.date) = ? AND
          YEAR(expenses.date) = ? AND
          expenses.user_id = ?
        GROUP BY day_of_month
        ORDER BY day_of_month`,
        [month, year, userId]
      );
      
      callback(null, rows);
    } catch (err) {
      console.error('Error in getDailyExpenses:', err);
      callback(err);
    }
  }

  // Delete an expense (keeping only one delete method)
  static async delete(expenseId, userId, callback) {
    try {
      const result = await db.query(
        'DELETE FROM expenses WHERE id = ? AND user_id = ?', 
        [expenseId, userId]
      );
      
      // Check if the expense was found and deleted
      if (result.affectedRows === 0) {
        // No expense found with the given ID and user ID
        return callback(null, { success: false, message: 'Expense not found or not authorized' });
      }
      
      callback(null, { 
        success: true, 
        message: 'Expense deleted successfully' 
      });
    } catch (err) {
      console.error('Error deleting expense:', err);
      callback(err);
    }
  }
}

// Export the Expense class
module.exports = Expense;
