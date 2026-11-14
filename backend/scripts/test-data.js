const db = require('../config/db');
const { encryptField } = require('../utils/fieldCrypto');

async function createTestData() {
  try {
    if (!process.env.ENC_KEY) {
      throw new Error('ENC_KEY is not set — refusing to write plaintext test data.');
    }

    // Get the existing test user
    const users = await db.query('SELECT id FROM users WHERE username = ?', ['testuser']);
    
    if (!users || users.length === 0) {
      throw new Error('Test user not found. Please run reset-db.js first.');
    }
    
    const userId = users[0].id;
    console.log('✅ Found test user with ID:', userId);
    
    // Create a test expense for the user (MIG-05: encrypted write only)
    const { enc, iv } = encryptField('Breakfast');
    const expenseResult = await db.query(
      `INSERT INTO expenses
        (user_id, amount, description, temp_description_enc, temp_description_iv, enc_v, category, date)
       VALUES (?, ?, '', ?, ?, 1, ?, ?)`,
      [userId, 1000, enc, iv, 'Food', '2025-09-12']
    );
    
    console.log('✅ Created test expense with ID:', expenseResult.insertId);
    
    console.log('\n✅ Test data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();
