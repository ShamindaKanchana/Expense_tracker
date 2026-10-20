const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const RefreshToken = require('../models/RefreshToken');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { userJwtSecret, missingSecretMessage } = require('../config/jwt');
const { checkBreached } = require('../utils/breachCheck');
const {
  validateBody,
  usernameSchema,
  passwordSchema,
  emailSchema
} = require('../middleware/validateBody');
const {
  loginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit
} = require('../middleware/rateLimit');

if (!userJwtSecret()) {
  console.error('FATAL ERROR:', missingSecretMessage);
  process.exit(1);
}

// AUTH-02: access tokens live 15 minutes; sessions are carried by a rotating
// httpOnly refresh cookie (30 days, DB-backed — see models/RefreshToken.js).
// SameSite=None; Secure so the cookie is sent from both the Vercel site and
// the Capacitor WebView origin (cross-site XHR). Chrome treats localhost as
// a secure context, so this still works in local dev.
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_COOKIE_NAME = 'et_refresh';

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api/auth',
    maxAge: RefreshToken.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api/auth'
  });
};

const readRefreshCookie = (req) => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
};

const clientIp = (req) =>
  req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  null;

// AUTH-05: strict schemas for every auth body.
const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    email: emailSchema
  })
  .strict();

const loginSchema = z
  .object({
    login: z.string().trim().min(1).max(254).optional(),
    identifier: z.string().trim().min(1).max(254).optional(),
    username: z.string().trim().min(1).max(30).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    password: z.string().min(1).max(128)
  })
  .strict()
  .refine(
    (data) => data.login || data.identifier || data.username || data.email,
    'Please enter your username or email.'
  );

const deleteAccountSchema = z
  .object({
    password: z.string().min(1).max(128).optional(),
    currentPassword: z.string().min(1).max(128).optional()
  })
  .strict()
  .refine(
    (data) => data.password || data.currentPassword,
    'Please enter your password to delete your account.'
  );

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    username: usernameSchema
  })
  .strict();

const resetPasswordSchema = z
  .object({
    username: usernameSchema,
    code: z.string().trim().regex(/^\d{6}$/, 'Invalid code'),
    newPassword: passwordSchema
  })
  .strict();

// @route   POST /api/auth/register
// @desc    Register with username + password (email optional, not required)
// @access  Public
router.post('/register', registerRateLimit, validateBody(registerSchema), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = req.body.password;
    // Optional for backward compatibility; new UI does not collect email
    const email = req.body.email ? String(req.body.email).trim() : null;

    const breach = await checkBreached(password);
    if (breach.breached) {
      return res.status(400).json({
        message: 'That password appears in known data breaches. Please choose a different one.'
      });
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

    const token = jwt.sign({ userId: newUser.id }, userJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });

    const refresh = await RefreshToken.issue(newUser.id, clientIp(req));
    setRefreshCookie(res, refresh.token);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);

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
router.post('/login', loginRateLimit, validateBody(loginSchema), async (req, res) => {
  try {
    // Accept: login, identifier, username, or email (for older clients)
    const login =
      req.body.login ||
      req.body.identifier ||
      req.body.username ||
      req.body.email;
    const { password } = req.body;

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
      userJwtSecret(),
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refresh = await RefreshToken.issue(user.id, clientIp(req));
    setRefreshCookie(res, refresh.token);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: User.resolveEmail(user)
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: "We couldn't sign you in right now. Please try again in a moment." });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await db.query(
      'SELECT id, username, email, temp_email_enc, temp_email_iv, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: User.resolveEmail(user),
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/auth/me
// @desc    Delete own account (PLAY-01): password confirm, cascade wipes
//          expenses + reset rows via FK. Client clears storage on success.
// @access  Private
router.delete('/me', auth, validateBody(deleteAccountSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const password = req.body.password || req.body.currentPassword;

    const rows = await db.query(
      'SELECT id, username, password FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // 400 (not 401) so the client does not treat this as session expiry
      return res.status(400).json({
        message: 'Password is incorrect. Your account was not deleted.'
      });
    }

    const username = user.username;
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    // FK cascade removes refresh rows; clear this client's cookie too.
    clearRefreshCookie(res);

    console.log(`User ${userId} deleted own account (username=${username})`);

    res.json({
      success: true,
      message: 'Your account and all its expenses were deleted.'
    });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({
      message: "We couldn't delete your account right now. Please try again in a moment."
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password for the logged-in user
// @access  Private
router.post('/change-password', auth, validateBody(changePasswordSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'Your new password must be different from your current password.'
      });
    }

    const breach = await checkBreached(newPassword);
    if (breach.breached) {
      return res.status(400).json({
        message: 'That password appears in known data breaches. Please choose a different one.'
      });
    }

    const rows = await db.query(
      'SELECT id, password FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // 400 (not 401) so the client does not treat this as a session expiry
      return res.status(400).json({
        message: 'Current password is incorrect. Please try again.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      userId
    ]);
    // AUTH-02: password change invalidates every other session.
    await RefreshToken.revokeAllForUser(userId);

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({
      message: "We couldn't update your password right now. Please try again in a moment."
    });
  }
});

const GENERIC_FORGOT_MESSAGE =
  'If this account exists, a reset request was sent to the administrator. They will share a one-time code if approved.';

// @route   POST /api/auth/forgot-password
// @desc    Create pending password-reset request (admin must approve)
// @access  Public
router.post('/forgot-password', forgotPasswordRateLimit, validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();

    const user = await new Promise((resolve, reject) => {
      User.findByUsername(username, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user) {
      const ip =
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;
      await PasswordResetRequest.createPending(user.id, ip);
    }

    res.json({ success: true, message: GENERIC_FORGOT_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    // Still avoid leaking internals; generic message
    res.json({ success: true, message: GENERIC_FORGOT_MESSAGE });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Set new password with username + one-time admin code
// @access  Public
router.post('/reset-password', resetPasswordRateLimit, validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const code = String(req.body.code || '').trim();
    const newPassword = req.body.newPassword;

    const request = await PasswordResetRequest.findApprovedForUsername(username);
    if (!request) {
      return res.status(400).json({
        message: 'Invalid or expired code. Request a new reset if needed.'
      });
    }

    const codeOk = await bcrypt.compare(code, request.code_hash);
    if (!codeOk) {
      return res.status(400).json({
        message: 'Invalid or expired code. Request a new reset if needed.'
      });
    }

    // AUTH-03: reset must also respect current≠new (same rule as change-password).
    const userRows = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [request.user_id]
    );
    if (userRows && userRows[0]) {
      const sameAsCurrent = await bcrypt.compare(newPassword, userRows[0].password);
      if (sameAsCurrent) {
        return res.status(400).json({
          message: 'Your new password must be different from your current password.'
        });
      }
    }

    const breach = await checkBreached(newPassword);
    if (breach.breached) {
      return res.status(400).json({
        message: 'That password appears in known data breaches. Please choose a different one.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      request.user_id
    ]);
    // AUTH-02: a reset invalidates every existing session.
    await RefreshToken.revokeAllForUser(request.user_id);
    await PasswordResetRequest.complete(request.id);

    res.json({
      success: true,
      message: 'Password updated. You can sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({
      message: "We couldn't reset your password right now. Please try again."
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Rotate the refresh cookie into a fresh 15-min access token.
//          Reuse of an already-rotated token revokes every session (theft).
// @access  Private (refresh cookie)
router.post('/refresh', async (req, res) => {
  try {
    const presented = readRefreshCookie(req);
    if (!presented) {
      return res.status(401).json({ message: 'No session. Please sign in.' });
    }

    const result = await RefreshToken.rotate(presented);
    if (result.error) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'No session. Please sign in.' });
    }

    setRefreshCookie(res, result.token);
    const token = jwt.sign(
      { userId: result.userId },
      userJwtSecret(),
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(401).json({ message: 'No session. Please sign in.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Revoke the presented refresh token and clear the cookie.
//          Idempotent — always succeeds from the client's view.
// @access  Private (refresh cookie)
router.post('/logout', async (req, res) => {
  try {
    const presented = readRefreshCookie(req);
    await RefreshToken.revoke(presented);
  } catch (error) {
    console.error('Logout error:', error.message);
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Signed out.' });
});

module.exports = router;
