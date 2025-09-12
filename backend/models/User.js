const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Create users table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
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
  // Create a new user
  static async create(userData, callback) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const { username, email } = userData;
      
      const result = await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      
      if (result.insertId) {
        // Fetch the newly created user
        const rows = await db.query(
          'SELECT id, username, email, created_at FROM users WHERE id = ?',
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
      console.error('Error creating user:', err);
      callback(err);
    }
  }

  // Find user by email
  static async findByEmail(email, callback) {
    try {
      const rows = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding user by email:', err);
      callback(err);
    }
  }

  // Find user by username
  static async findByUsername(username, callback) {
    try {
      const rows = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding user by username:', err);
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
