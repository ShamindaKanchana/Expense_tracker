const db = require('../config/db');

async function resetDatabase() {
  try {
    // Drop tables if they exist
    await db.query('DROP TABLE IF EXISTS expenses');
    await db.query('DROP TABLE IF EXISTS users');
    
    console.log('✅ Dropped existing tables');
    
    // Recreate users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ Created users table');
    
    // Recreate expenses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Others') NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (amount >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ Created expenses table');
    
    console.log('\n✅ Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
