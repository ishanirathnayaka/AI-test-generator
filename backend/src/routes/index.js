const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const codeRoutes = require('./codeRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API information endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI-Enhanced Test Case Generator API',
    version: process.env.npm_package_version || '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      code: '/api/code',
      health: '/api/health'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/code', codeRoutes);

// Handle 404 for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = router;