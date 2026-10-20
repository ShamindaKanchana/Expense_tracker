const db = require('../config/db');
const bcrypt = require('bcryptjs');
const {
  encryptField,
  decryptField,
  normalizeEmail,
  emailHmac
} = require('../utils/fieldCrypto');

// Create users table if it doesn't exist
// email is optional (NULL) so new accounts can use username + password only
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- ENC-02 migration columns (MIG pattern like expenses): temp_* prefix marks
    -- them for rename once legacy email is dropped. email_hmac is the blind
    -- index for uniqueness + login lookup (NULL for username-only accounts).
    temp_email_enc TEXT NULL,
    temp_email_iv VARCHAR(32) NULL,
    email_hmac VARCHAR(64) NULL,
    INDEX idx_users_email_hmac (email_hmac)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// Initialize the users table
const initTable = async () => {
  try {
    await db.query(createTableQuery);
    // Existing databases may still have email NOT NULL — allow username-only accounts.
    // Idempotent: MODIFY re-runs create a duplicate UNIQUE key on every boot
    // (MySQL auto-names them email_2, email_3, … up to the 64-key limit),
    // so only run when the column is actually NOT NULL.
    try {
      const [cols] = await db.query(
        `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'`
      );
      const rows = Array.isArray(cols) ? cols : [cols];
      if (rows[0] && rows[0].IS_NULLABLE === 'NO') {
        await db.query('ALTER TABLE users MODIFY email VARCHAR(100) UNIQUE NULL');
      }
    } catch (alterErr) {
      console.warn('Note: could not alter users.email (may already be nullable):', alterErr.message);
    }
    // ENC-02 convergence: bring pre-encryption DBs up to the encrypted schema.
    // Duplicate-column/index errors mean it is already there — safe to ignore.
    // Deadlocks (ER_LOCK_DEADLOCK 1213) are transient under concurrent DDL — retry.
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const alter of [
      'ALTER TABLE users ADD COLUMN temp_email_enc TEXT NULL',
      'ALTER TABLE users ADD COLUMN temp_email_iv VARCHAR(32) NULL',
      'ALTER TABLE users ADD COLUMN email_hmac VARCHAR(64) NULL',
      'ALTER TABLE users ADD INDEX idx_users_email_hmac (email_hmac)'
    ]) {
      let done = false;
      for (let attempt = 1; attempt <= 3 && !done; attempt += 1) {
        try {
          await db.query(alter);
          done = true;
        } catch (alterErr) {
          if (alterErr.code === 'ER_DUP_FIELDNAME' || alterErr.code === 'ER_DUP_KEYNAME') { done = true; break; }
          const deadlock = alterErr.code === 'ER_LOCK_DEADLOCK' || alterErr.errno === 1213;
          if (deadlock && attempt < 3) {
            console.warn(`Deadlock on users migration (attempt ${attempt}/3), retrying:`, alterErr.message);
            await sleep(500 * attempt);
            continue;
          }
          throw alterErr;
        }
      }
    }
    console.log('✅ Users table is ready');
  } catch (err) {
    console.error('❌ Error creating users table:', err.message);
    throw err;
  }
};

// Call the initialization
initTable().catch(console.error);

class User {
  /**
   * Dual-read resolver (ENC-02): prefer decrypted temp_* columns when present,
   * else fall back to legacy plaintext `email`. Never throws — falls back and
   * logs the row id only (LOG-01). NULL stays NULL (username-only accounts).
   */
  static resolveEmail(row) {
    if (row && row.temp_email_enc && row.temp_email_iv) {
      try {
        return decryptField(row.temp_email_enc, row.temp_email_iv);
      } catch (err) {
        console.error('User email decrypt failed for id:', row.id, '-', err.message);
      }
    }
    return row && row.email != null ? row.email : null;
  }

  /** Strip encryption material so ciphertext/IV never leave the API (ENC-02). */
  static stripEmailCrypto(obj) {
    if (obj && typeof obj === 'object') {
      delete obj.temp_email_enc;
      delete obj.temp_email_iv;
      delete obj.email_hmac;
    }
    return obj;
  }

  /** Normalize + build the dual-write envelope for an email (null-safe). */
  static encryptEmail(email) {
    const norm = normalizeEmail(email);
    if (!norm) return { email: null, enc: null, iv: null, hmac: null };
    try {
      const { enc, iv } = encryptField(norm);
      return { email: norm, enc, iv, hmac: emailHmac(norm) };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw err;
      console.warn('⚠️  ' + err.message + ' Writing legacy plaintext email (dev only).');
      return { email: norm, enc: null, iv: null, hmac: null };
    }
  }

  /** HMAC for lookup, or null when email empty / pepper missing in dev. */
  static hmacForLookup(email) {
    try {
      return emailHmac(email);
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw err;
      console.warn('⚠️  ' + err.message + ' Falling back to legacy email lookup (dev only).');
      return null;
    }
  }

  // Create a new user (email optional)
  static async create(userData, callback) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const username = String(userData.username || '').trim();
      const env = User.encryptEmail(userData.email);
      
      const result = await db.query(
        'INSERT INTO users (username, email, temp_email_enc, temp_email_iv, email_hmac, password) VALUES (?, ?, ?, ?, ?, ?)',
        [username, env.email, env.enc, env.iv, env.hmac, hashedPassword]
      );
      
      if (result.insertId) {
        // Fetch the newly created user
        const rows = await db.query(
          'SELECT id, username, email, temp_email_enc, temp_email_iv, created_at FROM users WHERE id = ?',
          [result.insertId]
        );
        
        if (rows.length > 0) {
          const user = rows[0];
          user.email = User.resolveEmail(user);
          User.stripEmailCrypto(user);
          callback(null, user);
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

  // Find user by email (HMAC blind index, legacy fallback pre-backfill)
  static async findByEmail(email, callback) {
    try {
      if (!email) return callback(null, null);
      const hmac = User.hmacForLookup(email);
      const rows = hmac
        ? await db.query(
            'SELECT * FROM users WHERE email_hmac = ? OR (email_hmac IS NULL AND email = ?)',
            [hmac, normalizeEmail(email)]
          )
        : await db.query('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding user by email:', err.message);
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

  // Find by username or email (for login field that accepts either).
  // Email matches via the HMAC blind index; the legacy `email = ?` OR-branch
  // keeps pre-backfill rows working until MIG-05 drops the plaintext column.
  static async findByLogin(login, callback) {
    try {
      const value = String(login || '').trim();
      if (!value) return callback(null, null);
      const hmac = User.hmacForLookup(value);
      const rows = hmac
        ? await db.query(
            'SELECT * FROM users WHERE username = ? OR email_hmac = ? OR (email_hmac IS NULL AND email IS NOT NULL AND email = ?)',
            [value, hmac, normalizeEmail(value)]
          )
        : await db.query(
            'SELECT * FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)',
            [value, normalizeEmail(value)]
          );
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
