const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const db = require('../config/db');
const auth = require('../middleware/auth');
const path = require('path');

// Test database connection (MySQL)
router.get('/test-db', async (req, res) => {
  try {
    const ping = await db.query('SELECT 1 AS ok');
    const tables = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name'
    );
    res.json({
      success: true,
      message: 'Database connection successful',
      ping: ping[0]?.ok === 1,
      tables: tables.map(t => t.table_name)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to connect to database',
      details: err.message
    });
  }
});

// Middleware to protect routes
// TODO: Create and implement auth middleware
// const auth = require('../middleware/auth');

// @route   GET /api/expenses/monthly-totals
// @desc    Get monthly totals for all months with expenses
// @access  Private


router.get('/monthly-totals', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        YEAR(\`date\`) AS year,
        MONTH(\`date\`) AS month,
        SUM(amount) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY YEAR(\`date\`), MONTH(\`date\`)
      ORDER BY total DESC
      LIMIT 1
    `;
    const rows = await db.query(sql, [userId]);
    if (!rows || rows.length === 0) {
      return res.json({ success: true, highestSpendingMonth: null });
    }
    const row = rows[0];
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    res.json({
      success: true,
      highestSpendingMonth: {
        month: monthNames[Number(row.month) - 1],
        year: row.year,
        total: Number(row.total)
      }
    });
  } catch (error) {
    console.error('Error in monthly-totals endpoint:', error);
    res.status(500).json({ error: 'Server error while fetching monthly totals' });
  }
});



// @route   GET /api/expenses/monthly-summary
// @desc    Get monthly summary data for the dashboard
// @access  Private
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT 
        YEAR(\`date\`) AS year,
        MONTH(\`date\`) AS month,
        SUM(amount) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY YEAR(\`date\`), MONTH(\`date\`)
      ORDER BY year, month
    `;
    const rows = await db.query(sql, [userId]);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthlyData = rows.map(r => ({
      month: monthNames[Number(r.month) - 1],
      year: r.year,
      total: Number(r.total)
    }));

    res.json({ success: true, monthlyData });
  } catch (error) {
    console.error('Error in monthly-summary endpoint:', error);
    res.status(500).json({ success: false, error: 'Server error while fetching monthly summary' });
  }
});

// @route   GET /api/expenses/current-month-total
// @desc    Get total expenses for the current month
// @access  Private
router.get('/current-month-total', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT COALESCE(SUM(amount), 0) AS total 
      FROM expenses 
      WHERE user_id = ?
        AND YEAR(\`date\`) = YEAR(CURDATE())
        AND MONTH(\`date\`) = MONTH(CURDATE())
    `;
    const rows = await db.query(sql, [userId]);
    const total = rows && rows[0] ? Number(rows[0].total) || 0 : 0;
    res.json({ success: true, total });
  } catch (error) {
    console.error('Error in current-month-total:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
router.get('/monthly', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
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

// @route   GET /api/expenses/top-category
// @desc    Get the top spending category
// @access  Private
router.get('/top-category', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `
      SELECT 
        category as name,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE user_id = ?
      GROUP BY category 
      ORDER BY total DESC
      LIMIT 1
    `;
    
    Expense.db.get(sql, [userId], (err, row) => {
      if (err) {
        console.error('Error fetching top category:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to fetch top category' 
        });
      }
      
      if (!row) {
        return res.json({
          success: true,
          data: null
        });
      }
      
      res.json({
        success: true,
        data: {
          name: row.name,
          total: parseFloat(row.total) || 0,
          count: row.count
        }
      });
    });
  } catch (error) {
    console.error('Error in top-category endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error while fetching top category' 
    });
  }
});

// @route   GET /api/expenses/recent
// @desc    Get latest 5 expenses for the user
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.query(
      `SELECT id, description, category, \`date\`, amount
       FROM expenses
       WHERE user_id = ?
       ORDER BY \`date\` DESC
       LIMIT 5`,
      [userId]
    );
    // Normalize types
    const expenses = rows.map(r => ({
      id: r.id,
      description: r.description,
      category: r.category,
      date: r.date,
      amount: Number(r.amount)
    }));
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching recent expenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/expenses/categories
// @desc    Get expenses grouped by category
// @access  Private
router.get('/categories', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get month and year from query params (optional)
    const { month, year } = req.query;
    
    let sql = `
      SELECT 
        category,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*) AS count
      FROM expenses 
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    if (month && year) {
      sql += ' AND MONTH(`date`) = ? AND YEAR(`date`) = ?';
      params.push(parseInt(month, 10), parseInt(year, 10));
    }
    
    sql += ' GROUP BY category ORDER BY total DESC';
    
    const rows = await db.query(sql, params);
    const categories = rows.map(row => ({
      id: String(row.category || '').toLowerCase(),
      name: row.category,
      total: Number(row.total) || 0,
      count: row.count
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('Error in categories route:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense
// @access  Private
router.post('/', auth, async (req, res) => {
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
      userId: req.user.id,
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
router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, description, category, date } = req.body;
    const { id } = req.params;
    const userId = req.user.id;

    // Validate request data
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid amount' });
    }
    
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Please provide a description' });
    }
    
    if (!category || category.trim() === '') {
      return res.status(400).json({ message: 'Please provide a category' });
    }

    // Find and update the expense
    const [result] = await db.query(
      'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ? AND user_id = ?',
      [amount, description.trim(), category.trim(), date || new Date(), id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    // Return the updated expense
    const [updatedExpense] = await db.query(
      'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json(updatedExpense[0]);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Delete the expense
    const [result] = await db.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
