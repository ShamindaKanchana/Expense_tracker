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
  // Create a new expense
  static create(expenseData, callback) {
    const { userId, amount, description, category } = expenseData;
    const sql = 'INSERT INTO expenses (user_id, amount, description, category) VALUES (?, ?, ?, ?)';
    
    db.run(sql, [userId, amount, description, category], function(err) {
      if (err) return callback(err);
      callback(null, { 
        id: this.lastID, 
        userId,
        amount,
        description,
        category,
        date: new Date().toISOString()
      });
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

  // Get monthly summary
  static getMonthlySummary(userId, year, month, callback) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    
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

  // Delete an expense
  static delete(expenseId, userId, callback) {
    const sql = 'DELETE FROM expenses WHERE id = ? AND user_id = ?';
    db.run(sql, [expenseId, userId], function(err) {
      if (err) return callback(err);
      callback(null, { changes: this.changes });
    });
  }
}

module.exports = Expense;
