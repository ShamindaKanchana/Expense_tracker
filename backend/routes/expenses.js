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
  // TODO: Implement logic to get monthly summary
  // 1. Get user ID from auth middleware
  // 2. Aggregate expenses by month
  // 3. Calculate total for each month
  // 4. Return array of { month: 'Jan', total: 1200, year: 2023 }
});

// @route   GET /api/expenses/categories
// @desc    Get expenses grouped by category
// @access  Private
router.get('/categories', /* auth, */ async (req, res) => {
  // TODO: Implement logic to get expenses by category
  // 1. Get user ID from auth middleware
  // 2. Group expenses by category
  // 3. Calculate total for each category
  // 4. Return array of { category: 'Food', total: 500 }
});

// @route   POST /api/expenses
// @desc    Add a new expense
// @access  Private
router.post('/', /* auth, */ async (req, res) => {
  // TODO: Implement logic to add a new expense
  // 1. Validate request data
  // 2. Get user ID from auth middleware
  // 3. Create new expense with user ID
  // 4. Save to database
  // 5. Return created expense
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
