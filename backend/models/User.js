const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Create users table if it doesn't exist.
// MIG-07 Phase 2: accounts are username + password only; no email columns.
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Initialize the users table
const initTable = async () => {
  try {
    await db.query(createTableQuery);
    console.log('✅ Users table is ready');
  } catch (err) {
    console.error('❌ Error creating users table:', err.message);
    throw err;
  }
};

// Call the initialization
initTable().catch(console.error);

class User {
  // Create a new username-only user (no email collection)
  static async create(userData, callback) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const username = String(userData.username || '').trim();

      const result = await db.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
      );

      if (result.insertId) {
        const rows = await db.query(
          'SELECT id, username, created_at FROM users WHERE id = ?',
          [result.insertId]
        );

        if (rows.length > 0) {
          callback(null, rows[0]);
        } else {
          callback(new Error('Failed to retrieve created user'));
        }
      } else {
        callback(new Error('Failed to create user'));
      }
    } catch (err) {
      console.error('Error creating user:', err.message);
      callback(err);
    }
  }

  // Find user by username
  static async findByUsername(username, callback) {
    try {
      const rows = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding user by username:', err.message);
      callback(err);
    }
  }

  // MIG-07 Phase 2: login is username-only.
  static async findByLogin(login, callback) {
    try {
      const username = String(login || '').trim();
      if (!username) return callback(null, null);
      const rows = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding user by login:', err.message);
      callback(err);
    }
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
