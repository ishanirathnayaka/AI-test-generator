const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Check if token starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Extract token
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Token is empty.',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Log successful authentication
    logger.debug(`User authenticated: ${req.user.id} - ${req.user.email}`);

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.logSecurityEvent(
        'TOKEN_EXPIRED',
        req.user?.id || 'unknown',
        req.ip,
        req.get('User-Agent')
      );
      
      return res.status(401).json({
        success: false,
        error: 'Access denied. Token has expired.',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.logSecurityEvent(
        'INVALID_TOKEN',
        req.user?.id || 'unknown',
        req.ip,
        req.get('User-Agent')
      );
      
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Token not active yet.',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    // Log unexpected errors
    logger.logError(error, {
      middleware: 'auth',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role || 'user',
          iat: decoded.iat,
          exp: decoded.exp
        };
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.debug('Optional auth failed:', error.message);
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.logSecurityEvent(
        'INSUFFICIENT_PERMISSIONS',
        req.user.id,
        req.ip,
        req.get('User-Agent')
      );

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Check if user owns resource
const requireOwnership = (getUserIdFromParams) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const resourceUserId = getUserIdFromParams(req);
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only access their own resources
    if (req.user.id !== resourceUserId) {
      logger.logSecurityEvent(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.user.id,
        req.ip,
        req.get('User-Agent')
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.',
        code: 'OWNERSHIP_REQUIRED'
      });
    }

    next();
  };
};

// API key authentication (for external integrations)
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required.',
        code: 'API_KEY_REQUIRED'
      });
    }

    // Validate API key (implement your own logic)
    // This is a placeholder - you should implement proper API key validation
    const isValidApiKey = process.env.VALID_API_KEYS?.split(',').includes(apiKey);
    
    if (!isValidApiKey) {
      logger.logSecurityEvent(
        'INVALID_API_KEY',
        'api-key-user',
        req.ip,
        req.get('User-Agent')
      );

      return res.status(401).json({
        success: false,
        error: 'Invalid API key.',
        code: 'INVALID_API_KEY'
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.logError(error, {
      middleware: 'apiKeyAuth',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error during API key authentication.',
      code: 'API_KEY_AUTH_ERROR'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireOwnership,
  apiKeyAuth
};