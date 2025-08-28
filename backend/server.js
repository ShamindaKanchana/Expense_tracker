require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, '../expense_tracker.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Enable foreign key constraints
    db.get("PRAGMA foreign_keys = ON");
    
    // Initialize database tables
    require('./models/User');
    require('./models/Expense');
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));

// Expense routes (partially implemented - uncomment when ready)
// app.use('/api/expenses', require('./routes/expenses'));

// Categories route is not implemented yet
// app.use('/api/categories', require('./routes/categories'));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
