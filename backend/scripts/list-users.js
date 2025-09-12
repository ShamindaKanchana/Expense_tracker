const db = require('../config/db');

async function listUsers() {
  try {
    const users = await db.query('SELECT * FROM users');
    console.log('\n📋 Existing Users:');
    console.table(users);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
