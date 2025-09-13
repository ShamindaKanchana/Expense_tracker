const db = require('../config/db');
const bcrypt = require('bcryptjs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function updatePassword() {
  try {
    // Get user input
    readline.question('Enter username or email: ', async (identifier) => {
      readline.question('Enter new password: ', { silent: true }, async (newPassword) => {
        try {
          // Hash the new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          
          // Update the password in the database
          const result = await db.query(
            'UPDATE users SET password = ? WHERE username = ? OR email = ?',
            [hashedPassword, identifier, identifier]
          );

          if (result.affectedRows > 0) {
            console.log('✅ Password updated successfully');
          } else {
            console.log('❌ No user found with that username or email');
          }
        } catch (err) {
          console.error('❌ Error updating password:', err.message);
        } finally {
          readline.close();
          // Close the database connection
          db.pool.end();
        }
      });
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updatePassword();
