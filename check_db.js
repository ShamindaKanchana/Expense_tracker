const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'expense_tracker.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  // Check table structure
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    console.log('Tables in database:');
    console.log(tables);
    
    // Check expenses table structure
    db.all("PRAGMA table_info(expenses)", (err, columns) => {
      console.log('\nExpenses table columns:');
      console.log(columns);
      
      // Get sample data
      db.all("SELECT * FROM expenses LIMIT 5", (err, rows) => {
        console.log('\nSample expense data:');
        console.log(rows);
        
        // Test date formatting
        db.all(`
          SELECT 
            date,
            strftime('%Y-%m-%d', date) as formatted_date,
            strftime('%Y', date) as year,
            strftime('%m', date) as month
          FROM expenses 
          LIMIT 5`, (err, dateRows) => {
          console.log('\nDate formatting test:');
          console.log(dateRows);
          
          db.close();
        });
      });
    });
  });
});
