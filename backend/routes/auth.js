const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../config/db');
const auth = require('../middleware/auth');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

// @route   POST /api/auth/register
// @desc    Register with username + password (email optional, not required)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = req.body.password;
    // Optional for backward compatibility; new UI does not collect email
    const email = req.body.email ? String(req.body.email).trim() : null;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please choose a username and password.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Your password needs at least 6 characters.' });
    }

    const existingByUsername = await new Promise((resolve, reject) => {
      User.findByUsername(username, (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    if (existingByUsername) {
      return res.status(400).json({ message: 'That username is taken. Please choose a different one.' });
    }

    if (email) {
      const existingByEmail = await new Promise((resolve, reject) => {
        User.findByEmail(email, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      if (existingByEmail) {
        return res.status(400).json({ message: 'This email is already registered. Try signing in instead.' });
      }
    }

    const newUser = await new Promise((resolve, reject) => {
      User.create({ username, email, password }, (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      const message = error.message?.includes('email')
        ? 'This email is already registered. Try signing in instead.'
        : 'That username is taken. Please choose a different one.';
      return res.status(400).json({ message });
    }

    res.status(500).json({ message: "We couldn't create your account right now. Please try again in a moment." });
  }
});

// @route   POST /api/auth/login
// @desc    Sign in with username or email + password
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Accept: login, identifier, username, or email (for older clients)
    const login =
      req.body.login ||
      req.body.identifier ||
      req.body.username ||
      req.body.email;
    const { password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: 'Please enter your username or email, and your password.' });
    }

    const user = await new Promise((resolve, reject) => {
      User.findByLogin(login, (err, found) => {
        if (err) reject(err);
        else resolve(found);
      });
    });

    if (!user) {
      return res.status(401).json({ message: 'Incorrect username/email or password. Please check and try again.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect username/email or password. Please check and try again.' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "We couldn't sign you in right now. Please try again in a moment." });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // User ID is available from req.user set by the auth middleware
    const userId = req.user.id;
    
    // Find user by ID without the password
    const [user] = await db.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
