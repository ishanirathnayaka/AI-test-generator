const { body, param, query, validationResult } = require('express-validator');
const CodeAnalysisService = require('../services/codeAnalysisService');
const TestGenerationService = require('../services/testGenerationService');
const CoverageAnalysisService = require('../services/coverageAnalysisService');

/**
 * Code Analysis Controller
 * Handles all code analysis related endpoints
 */
class CodeAnalysisController {
  /**
   * Analyze source code
   * POST /api/code/analyze
   */
  async analyzeCode(req, res) {
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

      const { code, language, fileName, analysisOptions } = req.body;
      const userId = req.user.id;

      // Perform code analysis
      const result = await CodeAnalysisService.analyzeCode({
        code,
        language,
        userId,
        fileName,
        analysisOptions
      });

      res.status(200).json({
        success: true,
        message: 'Code analysis completed successfully',
        data: {
          id: result._id,
          language: result.language,
          fileName: result.fileName,
          status: result.status,
          functions: result.functions,
          classes: result.classes,
          imports: result.imports,
          exports: result.exports,
          metrics: result.metrics,
          syntaxErrors: result.syntaxErrors,
          warnings: result.warnings,
          analyzedAt: result.analyzedAt,
          processingTime: result.processingTime
        }
      });

    } catch (error) {
      console.error('Code analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Code analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Get analysis by ID
   * GET /api/code/analysis/:id
   */
  async getAnalysis(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const analysis = await CodeAnalysisService.getAnalysis(id, userId);

      res.status(200).json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Get analysis error:', error);
      const statusCode = error.message === 'Analysis not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user's analysis history
   * GET /api/code/analysis
   */
  async getUserAnalyses(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        language: req.query.language,
        status: req.query.status,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await CodeAnalysisService.getUserAnalyses(userId, options);

      res.status(200).json({
        success: true,
        data: result.analyses,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get user analyses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analyses',
        error: error.message
      });
    }
  }

  /**
   * Delete analysis
   * DELETE /api/code/analysis/:id
   */
  async deleteAnalysis(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await CodeAnalysisService.deleteAnalysis(id, userId);

      res.status(200).json({
        success: true,
        message: 'Analysis deleted successfully'
      });

    } catch (error) {
      console.error('Delete analysis error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user analytics
   * GET /api/code/analytics
   */
  async getUserAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const timeRange = parseInt(req.query.timeRange) || 30;

      const analytics = await CodeAnalysisService.getUserAnalytics(userId, timeRange);

      res.status(200).json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  /**
   * Generate tests for analyzed code
   * POST /api/code/generate-tests
   */
  async generateTests(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { code, language, fileName, generationOptions } = req.body;
      const userId = req.user.id;

      // Generate tests
      const result = await TestGenerationService.generateTests({
        code,
        language,
        userId,
        fileName,
        generationOptions
      });

      res.status(200).json({
        success: true,
        message: 'Test generation completed successfully',
        data: result
      });

    } catch (error) {
      console.error('Test generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Test generation failed',
        error: error.message
      });
    }
  }

  /**
   * Get test generation by ID
   * GET /api/code/tests/:id
   */
  async getTestGeneration(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const generation = await TestGenerationService.getTestGeneration(id, userId);

      res.status(200).json({
        success: true,
        data: generation
      });

    } catch (error) {
      console.error('Get test generation error:', error);
      const statusCode = error.message === 'Test generation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user's test generations
   * GET /api/code/tests
   */
  async getUserTestGenerations(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        language: req.query.language,
        framework: req.query.framework,
        status: req.query.status
      };

      const result = await TestGenerationService.getUserGenerations(userId, options);

      res.status(200).json({
        success: true,
        data: result.generations,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get user test generations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test generations',
        error: error.message
      });
    }
  }

  /**
   * Analyze coverage
   * POST /api/code/analyze-coverage
   */
  async analyzeCoverage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { analysisId, testGenerationId, coverageOptions } = req.body;
      const userId = req.user.id;

      // Get analysis and test generation results
      const analysisResult = await CodeAnalysisService.getAnalysis(analysisId, userId);
      const testGeneration = await TestGenerationService.getTestGeneration(testGenerationId, userId);

      // Analyze coverage
      const result = await CoverageAnalysisService.analyzeCoverage({
        analysisResult,
        testGeneration,
        userId,
        coverageOptions
      });

      res.status(200).json({
        success: true,
        message: 'Coverage analysis completed successfully',
        data: result
      });

    } catch (error) {
      console.error('Coverage analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Coverage analysis failed',
        error: error.message
      });
    }
  }

  /**
   * Get coverage report by ID
   * GET /api/code/coverage/:id
   */
  async getCoverageReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const report = await CoverageAnalysisService.getCoverageReport(id, userId);

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Get coverage report error:', error);
      const statusCode = error.message === 'Coverage report not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get supported languages and frameworks
   * GET /api/code/supported
   */
  getSupportedOptions(req, res) {
    try {
      const supported = {
        languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp'],
        frameworks: {
          javascript: TestGenerationService.getSupportedFrameworks('javascript'),
          typescript: TestGenerationService.getSupportedFrameworks('typescript'),
          python: TestGenerationService.getSupportedFrameworks('python'),
          java: TestGenerationService.getSupportedFrameworks('java'),
          cpp: TestGenerationService.getSupportedFrameworks('cpp'),
          csharp: TestGenerationService.getSupportedFrameworks('csharp')
        }
      };

      res.status(200).json({
        success: true,
        data: supported
      });

    } catch (error) {
      console.error('Get supported options error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supported options',
        error: error.message
      });
    }
  }
}

// Validation rules
const codeAnalysisValidation = [
  body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ min: 10, max: 1000000 })
    .withMessage('Code must be between 10 and 1,000,000 characters'),
  
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp'])
    .withMessage('Unsupported language'),
  
  body('fileName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('File name too long'),
  
  body('analysisOptions')
    .optional()
    .isObject()
    .withMessage('Analysis options must be an object')
];

const testGenerationValidation = [
  body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ min: 10, max: 1000000 })
    .withMessage('Code must be between 10 and 1,000,000 characters'),
  
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp'])
    .withMessage('Unsupported language'),
  
  body('generationOptions')
    .optional()
    .isObject()
    .withMessage('Generation options must be an object')
];

const coverageAnalysisValidation = [
  body('analysisId')
    .notEmpty()
    .withMessage('Analysis ID is required')
    .isMongoId()
    .withMessage('Invalid analysis ID'),
  
  body('testGenerationId')
    .notEmpty()
    .withMessage('Test generation ID is required')
    .isMongoId()
    .withMessage('Invalid test generation ID'),
  
  body('coverageOptions')
    .optional()
    .isObject()
    .withMessage('Coverage options must be an object')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

module.exports = {
  CodeAnalysisController: new CodeAnalysisController(),
  codeAnalysisValidation,
  testGenerationValidation,
  coverageAnalysisValidation,
  idValidation
};