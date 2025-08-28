const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '../../expense_tracker.db');
const db = new sqlite3.Database(dbPath);

// Create users table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

class User {
  // Create a new user
  static create(userData, callback) {
    bcrypt.hash(userData.password, 10, (err, hashedPassword) => {
      if (err) return callback(err);
      
      const { username, email } = userData;
      const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      
      db.run(sql, [username, email, hashedPassword], function(err) {
        if (err) return callback(err);
        callback(null, { id: this.lastID, username, email });
      });
    });
  }

  // Find user by email
  static findByEmail(email, callback) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Find user by username
  static findByUsername(username, callback) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) return callback(err);
      callback(null, row);
    });
  }

  // Compare password
  static comparePassword(candidatePassword, hash, callback) {
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
      if (err) return callback(err);
      callback(null, isMatch);
    });
  }
}

module.exports = User;
