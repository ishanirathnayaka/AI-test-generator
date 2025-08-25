const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { asyncHandler, handleValidationErrors, ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Helper function to generate JWT tokens
const generateTokens = (userId, email, role = 'user') => {
  const payload = { userId, email, role };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Temporary in-memory user store (replace with database)
const users = new Map();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authLimiter,
  registerValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(user => user.email === email);
    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      role: 'user',
      createdAt: new Date(),
      isActive: true,
      aiUsage: {
        daily: 0,
        monthly: 0,
        total: 0,
        lastReset: new Date()
      }
    };

    users.set(userId, user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId, email, user.role);

    // Log successful registration
    logger.info(`New user registered: ${email}`, {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  authLimiter,
  loginValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = Array.from(users.values()).find(user => user.email === email);
    if (!user) {
      logger.logSecurityEvent(
        'LOGIN_ATTEMPT_INVALID_EMAIL',
        'unknown',
        req.ip,
        req.get('User-Agent')
      );
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.logSecurityEvent(
        'LOGIN_ATTEMPT_INACTIVE_USER',
        user.id,
        req.ip,
        req.get('User-Agent')
      );
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.logSecurityEvent(
        'LOGIN_ATTEMPT_INVALID_PASSWORD',
        user.id,
        req.ip,
        req.get('User-Agent')
      );
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Update last login
    user.lastLogin = new Date();

    // Log successful login
    logger.info(`User logged in: ${email}`, {
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.lastLogin
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      // Check if user still exists and is active
      const user = users.get(decoded.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user.id,
        user.email,
        user.role
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
          }
        }
      });
    } catch (error) {
      logger.logSecurityEvent(
        'INVALID_REFRESH_TOKEN',
        'unknown',
        req.ip,
        req.get('User-Agent')
      );
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate tokens)
 * @access  Private
 */
router.post('/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // In a real application, you would invalidate the token
    // by adding it to a blacklist or removing it from the database
    
    logger.info(`User logged out: ${req.user.email}`, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = users.get(req.user.id);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          aiUsage: user.aiUsage
        }
      }
    });
  })
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate token
 * @access  Private
 */
router.get('/validate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        tokenInfo: {
          issuedAt: new Date(req.user.iat * 1000),
          expiresAt: new Date(req.user.exp * 1000)
        }
      }
    });
  })
);

module.exports = router;