const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function createTestData() {
  try {
    // Get the existing test user
    const users = await db.query('SELECT id FROM users WHERE username = ?', ['testuser']);
    
    if (!users || users.length === 0) {
      throw new Error('Test user not found. Please run reset-db.js first.');
    }
    
    const userId = users[0].id;
    console.log('✅ Found test user with ID:', userId);
    
    // Create a test expense for the user
    const expenseResult = await db.query(
      'INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)',
      [userId, 1000, 'Breakfast', 'Food', '2025-09-12']
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
