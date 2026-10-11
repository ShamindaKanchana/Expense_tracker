const mysql = require('mysql2/promise');
require('dotenv').config();

// Build SSL config: verify with Aiven CA in prod / when CA is provided,
// disable SSL for localhost dev without CA.
function buildSslConfig() {
  const raw = process.env.DB_CA_CERT;
  const ca = raw ? raw.replace(/\\n/g, '\n') : undefined;
  const host = process.env.DB_HOST || '';

  const isLocalHost = ['', 'localhost', '127.0.0.1', '::1'].includes(host);
  if (isLocalHost && !ca) {
    return undefined; // local MySQL without SSL
  }
  if (ca) {
    return {
      rejectUnauthorized: true,
      ca,
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DB_CA_CERT is required in production for verified SSL (rejectUnauthorized:true)');
  }
  // Dev fallback without CA (e.g. local DB with SSL on but no cert yet)
  console.warn('⚠️ DB_CA_CERT not set — using unverified SSL (rejectUnauthorized:false) for dev only');
  return {
    rejectUnauthorized: false,
  };
}

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
  ssl: buildSslConfig(),
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
