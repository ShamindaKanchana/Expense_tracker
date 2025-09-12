const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    ssl: process.env.DB_SSL === 'true'
  }
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Successfully connected to MySQL database at', new Date().toISOString());
    connection.release();
  })
  .catch(err => {
    console.error('⚠️ Database connection error:', err.message);
  });

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit the process, let the application handle reconnection
});

// Export the pool with a query method that matches the expected interface
module.exports = {
  query: (text, params) => {
    return pool.query(text, params).then(([rows, fields]) => rows);
  },
  pool: {
    ...pool,
    getConnection: () => pool.getConnection(),
    end: () => pool.end()
  }
};
