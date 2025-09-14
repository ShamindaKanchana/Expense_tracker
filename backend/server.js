require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://expense-tracker-liard-nine.vercel.app' // Production domain
];

const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins for easier development
    if (isDevelopment) return callback(null, true);
    
    // In production, only allow specified origins
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg));
    }
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
