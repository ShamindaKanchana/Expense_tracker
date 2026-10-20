const jwt = require('jsonwebtoken');
const { userJwtSecret } = require('../config/jwt');

// Dev-only debug: never prints token values, headers, or decoded payloads.
// Enable with NODE_ENV=development when debugging locally; silent in production
// so bearer tokens can't leak into Render/Railway logs (see LOG-01).
const debug = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const auth = (req, res, next) => {
  try {
    debug('Auth middleware called');
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      debug('No Authorization header found');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    debug('Extracted token:', token ? 'Token exists' : 'No token');

    if (!token) {
      debug('No token found in Authorization header');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    debug('JWT Secret exists:', !!userJwtSecret());

    // Verify token (user secret only — admin tokens use JWT_ADMIN_SECRET)
    const decoded = jwt.verify(token, userJwtSecret());
    debug('Decoded token: <redacted>');

    // Add user from payload
    req.user = { id: decoded.userId };
    debug('Request user set, id:', req.user.id);

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.name);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
