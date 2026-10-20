const jwt = require('jsonwebtoken');
const { adminJwtSecret } = require('../config/jwt');

/**
 * Require a JWT with role === 'admin'. User tokens must not pass.
 */
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const secret = adminJwtSecret();
    if (!secret) {
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    // Verify with the admin secret only — a user token signed with
    // JWT_USER_SECRET cannot validate here even if role checks were bypassed.
    const decoded = jwt.verify(token, secret);

    if (decoded.role !== 'admin' || !decoded.adminId) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.admin = { id: decoded.adminId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = adminAuth;
