const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getModel } = require('../models');

/**
 * Authentication Controller
 * Handles user registration, login, and authentication
 */
class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, name, preferences } = req.body;
      const UserModel = getModel('User');

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = new UserModel({
        email,
        password: hashedPassword,
        name,
        preferences: preferences || {},
        isActive: true,
        lastActive: new Date()
      });

      await user.save();

      // Generate JWT token
      const token = this.generateToken(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const UserModel = getModel('User');

      // Find user
      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check if account is locked
      if (user.accountLocked && user.lockUntil > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.handleFailedLogin(user);
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Reset failed login attempts on successful login
      await this.handleSuccessfulLogin(user);

      // Generate JWT token
      const token = this.generateToken(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const UserModel = getModel('User');

      const user = await UserModel.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { name, preferences } = req.body;
      const UserModel = getModel('User');

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields
      if (name) user.name = name;
      if (preferences) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      await user.save();

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  /**
   * Change password
   * PUT /api/auth/password
   */
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const UserModel = getModel('User');

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      user.password = hashedNewPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const userId = req.user.id;
      const UserModel = getModel('User');

      // Verify user still exists and is active
      const user = await UserModel.findById(userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      // Generate new token
      const token = this.generateToken(user._id);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: error.message
      });
    }
  }

  /**
   * Logout user (invalidate token on client side)
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // Update last active timestamp
      const userId = req.user.id;
      const UserModel = getModel('User');

      await UserModel.findByIdAndUpdate(userId, {
        lastActive: new Date()
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(user) {
    const UserModel = getModel('User');
    
    // Increment failed attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    // Lock account after 5 failed attempts
    if (user.loginAttempts >= 5) {
      user.accountLocked = true;
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    await user.save();
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(user) {
    const UserModel = getModel('User');
    
    // Reset failed attempts and unlock account
    user.loginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = undefined;
    user.lastActive = new Date();
    
    await user.save();
  }
}

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
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

module.exports = {
  AuthController: new AuthController(),
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
};