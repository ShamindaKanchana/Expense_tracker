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
    description TEXT NOT NULL,
    category ${CATEGORY_ENUM} NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- ENC-01 migration columns (MIG-01): temp_* prefix marks them for rename
    -- to description_enc/description_iv once legacy column is dropped (MIG-05).
    temp_description_enc TEXT NULL,
    temp_description_iv VARCHAR(32) NULL,
    enc_v INT NOT NULL DEFAULT 0,
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
    // MIG-01 convergence: bring pre-encryption DBs up to the encrypted schema.
    // Duplicate-column errors mean the column is already there — safe to ignore.
    for (const alter of [
      'ALTER TABLE expenses ADD COLUMN temp_description_enc TEXT NULL',
      'ALTER TABLE expenses ADD COLUMN temp_description_iv VARCHAR(32) NULL',
      'ALTER TABLE expenses ADD COLUMN enc_v INT NOT NULL DEFAULT 0'
    ]) {
      try {
        await db.query(alter);
      } catch (alterErr) {
        if (alterErr.code !== 'ER_DUP_FIELDNAME') throw alterErr;
      }
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
   * Dual-read resolver (MIG-02/MIG-04): prefer decrypted temp_* columns when
   * enc_v === 1, else fall back to legacy plaintext `description`.
   * Never throws for clients — falls back and logs the row id only (LOG-01).
   */
  static resolveDescription(row) {
    if (row && Number(row.enc_v) === 1 && row.temp_description_enc && row.temp_description_iv) {
      try {
        return decryptField(row.temp_description_enc, row.temp_description_iv);
      } catch (err) {
        console.error('Expense decrypt failed for id:', row.id, '-', err.message);
      }
    }
    return row ? row.description : '';
  }

  /** Strip encryption material so ciphertext/IV never leave the API (ENC-01). */
  static stripCryptoMaterial(obj) {
    if (obj && typeof obj === 'object') {
      delete obj.temp_description_enc;
      delete obj.temp_description_iv;
      delete obj.enc_v;
    }
    return obj;
  }

  /**
   * Dual-write envelope (MIG-02): returns { enc, iv, encV } for the given text.
   * Fail-closed in production (no key = error); in development fall back to
   * legacy-only (enc_v 0) with a one-time warning so local dev keeps working.
   */
  static encryptDescription(description) {
    try {
      const { enc, iv } = encryptField(description);
      return { enc, iv, encV: 1 };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw err;
      console.warn('⚠️  ' + err.message + ' Writing legacy plaintext (dev only).');
      return { enc: null, iv: null, encV: 0 };
    }
  }

  constructor(expenseData = {}) {
    this.id = expenseData.id || null;
    this.userId = expenseData.userId || expenseData.user_id || null;
    this.amount = expenseData.amount || 0;
    this.description = Expense.resolveDescription(expenseData) || '';
    this.category = expenseData.category || '';
    this.date = expenseData.date || new Date().toISOString();
  }

  // Save the current expense instance
  async save(callback) {
    try {
      if (this.id) {
        // Update existing expense (dual-write MIG-02: legacy + encrypted)
        const cryptoEnv = Expense.encryptDescription(this.description);
        const sql = `
          UPDATE expenses 
          SET amount = ?, 
              description = ?, 
              temp_description_enc = ?,
              temp_description_iv = ?,
              enc_v = ?,
              category = ?, 
              date = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        
        const params = [
          this.amount,
          this.description,
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
        // Create new expense (dual-write MIG-02: legacy + encrypted)
        const cryptoEnv = Expense.encryptDescription(this.description);
        const sql = `
          INSERT INTO expenses (user_id, amount, description, temp_description_enc, temp_description_iv, enc_v, category, date) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          this.userId,
          this.amount,
          this.description,
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
