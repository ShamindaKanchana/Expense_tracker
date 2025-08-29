const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// Middleware to protect routes
// TODO: Create and implement auth middleware
// const auth = require('../middleware/auth');

// @route   GET /api/expenses
// @desc    Get all expenses for the logged-in user
// @access  Private
router.get('/', /* auth, */ async (req, res) => {
  // TODO: Implement logic to get all expenses for the current user
  // 1. Get user ID from auth middleware
  // 2. Find expenses by user ID
  // 3. Sort by date (newest first)
  // 4. Return expenses
});

// @route   GET /api/expenses/monthly
// @desc    Get monthly expense summary
// @access  Private
router.get('/monthly', /* auth, */ async (req, res) => {
  try {
    // TODO: Uncomment and use this when auth is implemented
    // const userId = req.user.id;
    const userId = 1; // Temporary hardcoded user ID for testing
    
    // Using the getMonthlySummary method which does the aggregation in SQL
    Expense.getMonthlySummary(userId, null, null, (err, monthlyData) => {
      if (err) {
        console.error('Error getting monthly summary:', err);
        return res.status(500).json({ 
          message: 'Error getting monthly summary', 
          error: err.message 
        });
      }
      
      // The data is already in the correct format from the model
      // Just ensure numbers are properly typed
      const formattedData = monthlyData.map(item => ({
        month: item.month,
        year: item.year,
        total: parseFloat(item.total) || 0,
        count: parseInt(item.count) || 0
      }));
      
      res.json(formattedData);
    });
  } catch (err) {
    console.error('Error in monthly summary route:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   GET /api/expenses/categories
// @desc    Get expenses grouped by category
// @access  Private
router.get('/categories', /* auth, */ async (req, res) => {
  try {
    // TODO: Uncomment and use this when auth is implemented
    // const userId = req.user.id;
    const userId = 1; // Temporary hardcoded user ID for testing
    
    // Get month and year from query params (optional)
    const { month, year } = req.query;
    
    let sql = `
      SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    if (month && year) {
      sql += ' AND strftime("%m", date) = ? AND strftime("%Y", date) = ?';
      params.push(month.padStart(2, '0'), year);
    }
    
    sql += ' GROUP BY category ORDER BY total DESC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error getting category data:', err);
        return res.status(500).json({ 
          message: 'Error getting category data',
          error: err.message 
        });
      }
      
      res.json(rows);
    });
  } catch (err) {
    console.error('Error in categories route:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense
// @access  Private
router.post('/', /* auth, */ async (req, res) => {
  try {
    // 1. Validate request data
    const { amount, description, category, date } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid amount' });
    }
    
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Please provide a description' });
    }
    
    if (!category || category.trim() === '') {
      return res.status(400).json({ message: 'Please provide a category' });
    }

    // 2. Create new expense instance
    const expense = new Expense({
      userId: 1, // Replace with req.user.id when auth is implemented
      amount: parseFloat(amount),
      description: description.trim(),
      category: category.trim(),
      date: date || new Date().toISOString()
    });

    // 3. Save to database using the instance method
    expense.save((err, savedExpense) => {
      if (err) {
        console.error('Error saving expense:', err);
        return res.status(500).json({ message: 'Error saving expense', error: err.message });
      }
      
      // 4. Return created expense
      res.status(201).json(savedExpense);
    });
    
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', /* auth, */ async (req, res) => {
  // TODO: Implement logic to update an expense
  // 1. Validate request data
  // 2. Find expense by ID and user ID
  // 3. Update expense
  // 4. Return updated expense
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', /* auth, */ async (req, res) => {
  // TODO: Implement logic to delete an expense
  // 1. Find expense by ID and user ID
  // 2. Delete expense
  // 3. Return success message
});

module.exports = router;
