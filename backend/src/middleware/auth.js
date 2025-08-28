const jwt = require('jsonwebtoken');
const { getModel } = require('../models');

/**
 * Authentication Middleware
 * Validates JWT tokens and authenticates users
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const UserModel = getModel('User');
    const user = await UserModel.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Check if account is locked
    if (user.accountLocked && user.lockUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked.'
      });
    }

    // Add user to request object
    req.user = user;

    // Update last active timestamp (optional, can be done async)
    UserModel.findByIdAndUpdate(user._id, { 
      lastActive: new Date() 
    }).catch(err => console.warn('Failed to update last active:', err.message));

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
