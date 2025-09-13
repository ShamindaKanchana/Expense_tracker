const db = require('../config/db');

const createCategoriesTable = async () => {
  try {
    // Create categories table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert default categories if they don't exist
    const defaultCategories = [
      'Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Others'
    ];

    for (const category of defaultCategories) {
      await db.query('INSERT IGNORE INTO categories (name) VALUES (?)', [category]);
    }

    console.log('Categories table created and seeded successfully');
  } catch (error) {
    console.error('Error creating categories table:', error);
    throw error;
  }
};

// Run the migration
createCategoriesTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
