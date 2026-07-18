const jwt = require('jsonwebtoken');

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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
