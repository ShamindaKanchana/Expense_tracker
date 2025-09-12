const { pool } = require('./config/db');

// Test the database connection
async function testConnection() {
  let connection;
  try {
    console.log('Testing database connection...');
    
    // Get a connection from the pool
    connection = await pool.getConnection();
    
    // Test the connection with a simple query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ Database connection successful! Test calculation result:', rows[0].result);
    
    // Test users table
    // Test expenses table
    try {
      console.log('\nTesting expenses table...');
      const [expenses] = await connection.query('SELECT COUNT(*) as count FROM expenses');
      console.log(`✅ Expenses table exists and has ${expenses[0].count} records`);
    } catch (err) {
      console.error('⚠️ Error accessing expenses table:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    // Release the connection back to the pool
    if (connection) await connection.release();
    
    // Close the pool when done
    await pool.end();
    process.exit();
  }
}

testConnection();
