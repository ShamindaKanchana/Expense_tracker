const db = require('../config/db');
const bcrypt = require('bcryptjs');

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS admins (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const seedAdminFromEnv = async () => {
  const username = process.env.ADMIN_USERNAME
    ? String(process.env.ADMIN_USERNAME).trim()
    : '';
  const password = process.env.ADMIN_PASSWORD
    ? String(process.env.ADMIN_PASSWORD)
    : '';

  if (!username || !password) {
    console.warn(
      '⚠️  ADMIN_USERNAME / ADMIN_PASSWORD not set — no admin account will be seeded. Set them in .env to use /admin.'
    );
    return;
  }

  if (password.length < 6) {
    console.warn('⚠️  ADMIN_PASSWORD must be at least 6 characters — skip seed.');
    return;
  }

  const existing = await db.query('SELECT id FROM admins WHERE username = ?', [username]);
  if (existing && existing.length > 0) {
    console.log('✅ Admin account already exists:', username);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO admins (username, password) VALUES (?, ?)', [
    username,
    hashed
  ]);
  console.log('✅ Seeded admin account from env:', username);
};

const initTable = async () => {
  try {
    await db.query(createTableQuery);
    console.log('✅ Admins table is ready');
    await seedAdminFromEnv();
  } catch (err) {
    console.error('❌ Error initializing admins table:', err.message);
    throw err;
  }
};

initTable().catch(console.error);

class Admin {
  static async findByUsername(username, callback) {
    try {
      const rows = await db.query('SELECT * FROM admins WHERE username = ?', [
        String(username || '').trim()
      ]);
      callback(null, rows[0] || null);
    } catch (err) {
      console.error('Error finding admin by username:', err);
      callback(err);
    }
  }

  static async findById(id, callback) {
    try {
      const rows = await db.query(
        'SELECT id, username, created_at FROM admins WHERE id = ?',
        [id]
      );
      callback(null, rows[0] || null);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = Admin;
