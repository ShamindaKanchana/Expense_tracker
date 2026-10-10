const db = require('../config/db');

async function listUsers() {
  try {
    // Never select password hashes — they enable offline brute-force (see LOG-01).
    const users = await db.query('SELECT id, username, email, created_at FROM users');
    console.log('\n📋 Existing Users:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  }
}

listUsers();
