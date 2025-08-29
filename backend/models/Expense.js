const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database (same as in User.js)
const dbPath = path.join(__dirname, '../../expense_tracker.db');
const db = new sqlite3.Database(dbPath);

// Create expenses table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Others')),
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

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
  save(callback) {
    if (this.id) {
      // Update existing expense
      const sql = `
        UPDATE expenses 
        SET amount = ?, description = ?, category = ?, date = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      const params = [
        this.amount,
        this.description,
        this.category,
        this.date,
        this.id
      ];
      
      db.run(sql, params, (err) => {
        if (err) return callback(err);
        callback(null, this);
      });
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
      
      db.run(sql, params, function(err) {
        if (err) return callback(err);
        this.id = this.lastID;
        callback(null, this);
      }.bind(this));
    }
  }

  // Static method to find an expense by ID
  static findById(id, callback) {
    db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, row) => {
      if (err) return callback(err);
      if (!row) return callback(null, null);
      callback(null, new Expense(row));
    });
  }

  // Get all expenses for a user
  static findByUser(userId, callback) {
    const sql = 'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC';
    db.all(sql, [userId], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Get expenses by category for a user
  static getByCategory(userId, callback) {
    const sql = `
      SELECT category, SUM(amount) as total 
      FROM expenses 
      WHERE user_id = ? 
      GROUP BY category
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Update an existing expense
  static updateById(id, updateData, callback) {
    const expense = new Expense({...updateData, id});
    expense.save(callback);
  }

  // Delete an expense
  static deleteById(id, callback) {
    const sql = 'DELETE FROM expenses WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) return callback(err);
      callback(null, { success: true, changes: this.changes });
    });
  }

  // Get monthly summary for a user
  static getMonthlySummary(userId, year = null, month = null, callback) {
    try {
      console.log('Getting monthly summary for user:', userId, 'year:', year, 'month:', month);
  
      // Base SQL
      let sql = `
        SELECT 
          strftime('%m', date) AS month,    -- month (01-12)
          strftime('%Y', date) AS year,     -- year (e.g., 2025)
          SUM(amount) AS total,             -- total expenses
          COUNT(*) AS count                 -- number of records
        FROM expenses 
        WHERE user_id = ?
      `;
  
      const params = [userId];
  
      // Optional filters
      if (year) {
        sql += ` AND strftime('%Y', date) = ?`;
        params.push(year.toString());
      }
      if (month) {
        sql += ` AND strftime('%m', date) = ?`;
        params.push(month.toString().padStart(2, '0')); // ensure 01, 02 etc.
      }
  
      sql += `
        GROUP BY year, month
        ORDER BY year, month;
      `;
  
      // Execute the query
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database error in getMonthlySummary:', err);
          return callback(err);
        }
  
        // Format the data to match frontend expectations
        const result = rows.map(row => ({
          month: parseInt(row.month), // Convert month to number (e.g., '08' -> 8)
          year: parseInt(row.year),   // Ensure year is a number
          total: parseFloat(row.total) || 0,
          count: parseInt(row.count) || 0
        }));
  
        callback(null, result);
      });
    } catch (err) {
      console.error('Error in getMonthlySummary:', err);
      callback(err);
    }
  }
  

  // Get recent expenses for a user
  static getRecent(userId, limit = 5, callback) {
    const sql = `
      SELECT * FROM expenses 
      WHERE user_id = ? 
      ORDER BY date DESC, id DESC 
      LIMIT ?
    `;
    db.all(sql, [userId, limit], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows.map(row => new Expense(row)));
    });
  }

  // Get daily expenses for a specific month
  static getDailyExpenses(userId, year, month, callback) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    
    const sql = `
      SELECT 
        strftime('%d', date) as day,
        SUM(amount) as total
      FROM expenses
      WHERE user_id = ? 
        AND date >= ? 
        AND date < ?
      GROUP BY day
      ORDER BY day
    `;
    
    db.all(sql, [userId, startDate, endDate], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows);
    });
  }

  // Delete an expense (keeping only one delete method)
  static delete(expenseId, userId, callback) {
    const sql = 'DELETE FROM expenses WHERE id = ? AND user_id = ?';
    db.run(sql, [expenseId, userId], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }
}

// Export both the Expense class and the db instance
Expense.db = db;
module.exports = Expense;
