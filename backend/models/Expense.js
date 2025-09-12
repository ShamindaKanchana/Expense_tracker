const db = require('../config/db');

// Create expenses table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS expenses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Others') NOT NULL,
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
    console.log('✅ Expenses table is ready');
  } catch (err) {
    console.error('❌ Error creating expenses table:', err.message);
    throw err;
  }
};

// Call the initialization
initTable().catch(console.error);

class Expense {
  constructor(expenseData = {}) {
    this.id = expenseData.id || null;
    this.userId = expenseData.userId || null;
    this.amount = expenseData.amount || 0;
    this.description = expenseData.description || '';
    this.category = expenseData.category || '';
    this.date = expenseData.date || new Date().toISOString();
  }

  // Save the current expense instance
  async save(callback) {
    try {
      if (this.id) {
        // Update existing expense
        const sql = `
          UPDATE expenses 
          SET amount = ?, 
              description = ?, 
              category = ?, 
              date = ?,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        
        const params = [
          this.amount,
          this.description,
          this.category,
          this.date,
          this.id
        ];
        
        console.log('Updating expense with SQL:', sql, 'Params:', params);
        
        const result = await db.query(sql, params);
        
        // Fetch the updated record
        if (result.affectedRows > 0) {
          const rows = await db.query('SELECT * FROM expenses WHERE id = ?', [this.id]);
          if (rows.length > 0) {
            Object.assign(this, rows[0]);
          }
          callback(null, this);
        } else {
          callback(new Error('No expense found with the given ID'));
        }
      } else {
        // Create new expense
        const sql = `
          INSERT INTO expenses (user_id, amount, description, category, date) 
          VALUES (?, ?, ?, ?, ?)
        `;
        
        const params = [
          this.userId,
          this.amount,
          this.description,
          this.category,
          this.date
        ];
        
        console.log('Inserting new expense with SQL:', sql, 'Params:', params);
        
        const result = await db.query(sql, params);
        
        if (result.insertId) {
          this.id = result.insertId;
          // Fetch the newly created record
          const rows = await db.query('SELECT * FROM expenses WHERE id = ?', [this.id]);
          if (rows.length > 0) {
            Object.assign(this, rows[0]);
          }
          console.log('Expense saved successfully with ID:', this.id);
          callback(null, this);
        } else {
          throw new Error('Failed to insert expense');
        }
      }
    } catch (err) {
      console.error('Error in save method:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
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
