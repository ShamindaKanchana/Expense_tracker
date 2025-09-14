const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    console.log('Auth middleware called');
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader);
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Add user from payload
    req.user = { id: decoded.userId };
    console.log('Request user set to:', req.user);
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};

module.exports = auth;
