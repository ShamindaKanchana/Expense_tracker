const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  // TODO: Implement user registration logic
  // 1. Validate request data
  // 2. Check if user already exists
  // 3. Hash password
  // 4. Create new user
  // 5. Generate JWT token
  // 6. Return token and user data (without password)
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  // TODO: Implement user login logic
  // 1. Validate request data
  // 2. Find user by email/username
  // 3. Compare passwords
  // 4. Generate JWT token
  // 5. Return token and user data (without password)
});

// @route   GET /api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', (req, res) => {
  // TODO: Add authentication middleware
  // 1. Get user ID from JWT token
  // 2. Find user by ID
  // 3. Return user data (without password)
});

module.exports = router;
