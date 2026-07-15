require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration — set CORS_ALLOWED_ORIGINS as comma-separated URLs in production
const isDevelopment = process.env.NODE_ENV === 'development';
const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultDevOrigins;

const corsOptions = {
  origin(origin, callback) {
    // In development or for non-browser clients (no origin header), allow everything
    if (isDevelopment || !origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      // Explicitly echo back the requesting origin so browsers accept the response
      return callback(null, origin);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

console.log(`Server running in ${isDevelopment ? 'development' : 'production'} mode`);

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes
app.use(express.json());

// Initialize MySQL models (tables will be created if not exist)
require('./models/User');
require('./models/Expense');

// Routes
app.use('/api/auth', require('./routes/auth'));

// Expense routes
app.use('/api/expenses', require('./routes/expenses'));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running');
});

// Return JSON errors (not HTML pages) so the React app can show messages in the UI
app.use((err, req, res, next) => {
  console.error('API error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
