const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  CodeAnalysisController,
  codeAnalysisValidation,
  testGenerationValidation,
  coverageAnalysisValidation,
  idValidation
} = require('../controllers/codeAnalysisController');

// All routes require authentication
router.use(authMiddleware);

// Code Analysis Routes
router.post('/analyze', codeAnalysisValidation, CodeAnalysisController.analyzeCode);
router.get('/analysis/:id', idValidation, CodeAnalysisController.getAnalysis);
router.get('/analysis', CodeAnalysisController.getUserAnalyses);
router.delete('/analysis/:id', idValidation, CodeAnalysisController.deleteAnalysis);
router.get('/analytics', CodeAnalysisController.getUserAnalytics);

// Test Generation Routes
router.post('/generate-tests', testGenerationValidation, CodeAnalysisController.generateTests);
router.get('/tests/:id', idValidation, CodeAnalysisController.getTestGeneration);
router.get('/tests', CodeAnalysisController.getUserTestGenerations);

// Coverage Analysis Routes
router.post('/analyze-coverage', coverageAnalysisValidation, CodeAnalysisController.analyzeCoverage);
router.get('/coverage/:id', idValidation, CodeAnalysisController.getCoverageReport);

// Utility Routes
router.get('/supported', CodeAnalysisController.getSupportedOptions);

module.exports = router;