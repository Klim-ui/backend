const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - authentication middleware
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token with fallback secret
    const secret = process.env.JWT_SECRET || 'DEFAULT_JWT_SECRET_FOR_DEVELOPMENT_ONLY';
    const decoded = jwt.verify(token, secret);

    // Get user from the token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found with this token',
      });
    }

    next();
  } catch (error) {
    req.logger?.error(`Auth middleware error: ${error.message}`);
    
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Grant access to specific roles
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Only admins can access this route',
    });
  }
}; 