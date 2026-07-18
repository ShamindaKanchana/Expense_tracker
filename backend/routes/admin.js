const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const adminAuth = require('../middleware/adminAuth');
const db = require('../config/db');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined (admin routes).');
}

// @route   POST /api/admin/login
// @desc    Admin sign-in (separate from user auth)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Please enter admin username and password.'
      });
    }

    const admin = await new Promise((resolve, reject) => {
      Admin.findByUsername(username, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!admin) {
      return res.status(401).json({
        message: 'Incorrect username or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Incorrect username or password.'
      });
    }

    const token = jwt.sign(
      { adminId: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: "We couldn't sign you in right now. Please try again."
    });
  }
});

// @route   GET /api/admin/me
// @desc    Current admin profile
// @access  Admin
router.get('/me', adminAuth, async (req, res) => {
  try {
    const admin = await new Promise((resolve, reject) => {
      Admin.findById(req.admin.id, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Admin me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    List user accounts + total count (no passwords)
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.created_at,
         (SELECT COUNT(*) FROM expenses e WHERE e.user_id = u.id) AS expense_count
       FROM users u
       ORDER BY u.created_at DESC`
    );

    const users = (rows || []).map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email || null,
      created_at: r.created_at,
      expense_count: Number(r.expense_count) || 0
    }));

    res.json({
      total: users.length,
      users
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user account (expenses cascade via FK)
// @access  Admin
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId) || userId < 1) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const existing = await db.query(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const username = existing[0].username;

    // Hard delete — expenses removed by ON DELETE CASCADE
    const result = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    const affected = result.affectedRows ?? result.affected_rows ?? 0;

    if (!affected) {
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log(
      `Admin ${req.admin.id} deleted user id=${userId} username=${username}`
    );

    res.json({
      success: true,
      message: `Account "${username}" was deleted.`,
      deleted: { id: userId, username }
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({
      message: "We couldn't delete that account. Please try again."
    });
  }
});

module.exports = router;
