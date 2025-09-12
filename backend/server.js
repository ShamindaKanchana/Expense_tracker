require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
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
