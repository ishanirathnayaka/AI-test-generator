const crypto = require('crypto');
const { performance } = require('perf_hooks');
const CodeAnalysis = require('../models/CodeAnalysis');
const { getModel } = require('../models');
const javascriptParser = require('./parsers/javascriptParser');
const typescriptParser = require('./parsers/typescriptParser');
const pythonParser = require('./parsers/pythonParser');
const javaParser = require('./parsers/javaParser');
const cppParser = require('./parsers/cppParser');
const csharpParser = require('./parsers/csharpParser');

/**
 * Core Code Analysis Service
 * Orchestrates the analysis of source code across multiple programming languages
 */
class CodeAnalysisService {
  constructor() {
    this.parsers = {
      javascript: javascriptParser,
      typescript: typescriptParser,
      python: pythonParser,
      java: javaParser,
      cpp: cppParser,
      csharp: csharpParser
    };
  }

  /**
   * Analyze source code and extract structural information
   * @param {Object} options - Analysis options
   * @param {string} options.code - Source code to analyze
   * @param {string} options.language - Programming language
   * @param {string} options.userId - User ID performing analysis
   * @param {string} options.fileName - Optional file name
   * @param {Object} options.analysisOptions - Analysis configuration
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeCode(options) {
    const startTime = performance.now();
    const {
      code,
      language,
      userId,
      fileName = 'unnamed',
      analysisOptions = {}
    } = options;

    try {
      // Validate input
      this.validateInput(code, language, userId);

      // Check for existing analysis
      const codeHash = this.generateCodeHash(code, language);
      const existingAnalysis = await this.findExistingAnalysis(codeHash, userId);
      
      if (existingAnalysis && !analysisOptions.forceReanalysis) {
        return existingAnalysis;
      }

      // Create new analysis record
      const analysisRecord = await this.createAnalysisRecord({
        code,
        language,
        userId,
        fileName,
        codeHash,
        analysisOptions
      });

      // Perform analysis
      const analysisResult = await this.performAnalysis(code, language, analysisOptions);
      
      // Update analysis record with results
      const completedAnalysis = await this.completeAnalysis(
        analysisRecord,
        analysisResult,
        performance.now() - startTime
      );

      return completedAnalysis;

    } catch (error) {
      console.error('Code analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate analysis input parameters
   */
  validateInput(code, language, userId) {
    if (!code || typeof code !== 'string') {
      throw new Error('Code is required and must be a string');
    }

    if (code.length > 1000000) { // 1MB limit
      throw new Error('Code size exceeds maximum limit of 1MB');
    }

    if (!language || !this.parsers[language]) {
      throw new Error(`Unsupported programming language: ${language}`);
    }

    if (!userId) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Generate hash for code deduplication
   */
  generateCodeHash(code, language) {
    return crypto
      .createHash('sha256')
      .update(code + language)
      .digest('hex');
  }

  /**
   * Find existing analysis for the same code
   */
  async findExistingAnalysis(codeHash, userId) {
    try {
      const CodeAnalysisModel = getModel('CodeAnalysis');
      const existing = await CodeAnalysisModel.findOne({
        codeHash,
        userId,
        status: 'completed'
      }).sort({ createdAt: -1 });

      return existing;
    } catch (error) {
      console.warn('Error checking for existing analysis:', error);
      return null;
    }
  }

  /**
   * Create initial analysis record
   */
  async createAnalysisRecord(options) {
    const {
      code,
      language,
      userId,
      fileName,
      codeHash,
      analysisOptions
    } = options;

    const CodeAnalysisModel = getModel('CodeAnalysis');
    
    const analysisRecord = new CodeAnalysisModel({
      userId,
      code,
      language,
      fileName,
      codeHash,
      status: 'processing',
      analysisOptions: {
        includeAST: false,
        includeMetrics: true,
        includeDependencies: true,
        complexityThreshold: 10,
        ...analysisOptions
      }
    });

    return await analysisRecord.save();
  }

  /**
   * Perform the actual code analysis
   */
  async performAnalysis(code, language, options = {}) {
    const parser = this.parsers[language];
    
    if (!parser) {
      throw new Error(`No parser available for language: ${language}`);
    }

    try {
      // Parse code and extract structure
      const parseResult = await parser.parse(code, options);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(code, language, parseResult);
      
      // Extract dependencies if requested
      const dependencies = options.includeDependencies 
        ? this.extractDependencies(parseResult) 
        : [];

      return {
        ...parseResult,
        metrics,
        dependencies,
        analysisMetadata: {
          parserVersion: parser.version || '1.0.0',
          timestamp: new Date().toISOString(),
          options
        }
      };

    } catch (error) {
      console.error(`Analysis failed for ${language}:`, error);
      throw new Error(`Parser error: ${error.message}`);
    }
  }

  /**
   * Calculate code metrics
   */
  calculateMetrics(code, language, parseResult) {
    const lines = code.split('\n');
    const commentRegexes = {
      javascript: /^\s*(\/\/|\/\*|\*|$)/,
      typescript: /^\s*(\/\/|\/\*|\*|$)/,
      python: /^\s*(#|$)/,
      java: /^\s*(\/\/|\/\*|\*|$)/,
      cpp: /^\s*(\/\/|\/\*|\*|$)/,
      csharp: /^\s*(\/\/|\/\*|\*|$)/
    };

    const commentRegex = commentRegexes[language] || commentRegexes.javascript;
    
    let logicalLines = 0;
    let commentLines = 0;
    let blankLines = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        blankLines++;
      } else if (commentRegex.test(trimmed)) {
        commentLines++;
      } else {
        logicalLines++;
      }
    });

    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code, language);
    const cognitiveComplexity = this.calculateCognitiveComplexity(parseResult);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      lines.length, 
      cyclomaticComplexity, 
      code.length
    );

    return {
      linesOfCode: lines.length,
      logicalLines,
      commentLines,
      blankLines,
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex,
      technicalDebt: this.calculateTechnicalDebt(maintainabilityIndex, cyclomaticComplexity)
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateCyclomaticComplexity(code, language) {
    const complexityPatterns = {
      javascript: /\b(if|else|while|for|switch|case|catch|try|\?\s*|\|\||&&)\b/g,
      typescript: /\b(if|else|while|for|switch|case|catch|try|\?\s*|\|\||&&)\b/g,
      python: /\b(if|elif|else|while|for|except|try|and|or)\b/g,
      java: /\b(if|else|while|for|switch|case|catch|try|\?\s*|\|\||&&)\b/g,
      cpp: /\b(if|else|while|for|switch|case|catch|try|\?\s*|\|\||&&)\b/g,
      csharp: /\b(if|else|while|for|switch|case|catch|try|\?\s*|\|\||&&)\b/g
    };

    const pattern = complexityPatterns[language] || complexityPatterns.javascript;
    const matches = code.match(pattern);
    
    return (matches ? matches.length : 0) + 1; // Base complexity of 1
  }

  /**
   * Calculate cognitive complexity based on AST
   */
  calculateCognitiveComplexity(parseResult) {
    // Simplified cognitive complexity calculation
    // In a real implementation, this would analyze nesting levels and control structures
    const { functions = [], classes = [] } = parseResult;
    
    let totalComplexity = 0;
    
    functions.forEach(func => {
      totalComplexity += func.complexity || 1;
    });
    
    classes.forEach(cls => {
      cls.methods?.forEach(method => {
        totalComplexity += method.complexity || 1;
      });
    });
    
    return Math.max(totalComplexity, 1);
  }

  /**
   * Calculate maintainability index
   */
  calculateMaintainabilityIndex(linesOfCode, complexity, volume) {
    // Simplified maintainability index formula
    // Real formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
    const halsteadVolume = Math.log(volume + 1);
    const complexityFactor = complexity * 0.23;
    const locFactor = Math.log(linesOfCode + 1) * 16.2;
    
    const maintainability = Math.max(0, 171 - 5.2 * halsteadVolume - complexityFactor - locFactor);
    
    return Math.round(maintainability);
  }

  /**
   * Calculate technical debt
   */
  calculateTechnicalDebt(maintainabilityIndex, complexity) {
    let rating = 'A';
    let hours = 0;

    if (maintainabilityIndex < 10) {
      rating = 'E';
      hours = complexity * 2;
    } else if (maintainabilityIndex < 20) {
      rating = 'D';
      hours = complexity * 1.5;
    } else if (maintainabilityIndex < 50) {
      rating = 'C';
      hours = complexity;
    } else if (maintainabilityIndex < 85) {
      rating = 'B';
      hours = complexity * 0.5;
    }

    return { hours: Math.round(hours), rating };
  }

  /**
   * Extract dependencies from parse result
   */
  extractDependencies(parseResult) {
    const { imports = [], exports = [] } = parseResult;
    
    return {
      imports: imports.map(imp => ({
        source: imp.source,
        imports: imp.imports || [],
        isExternal: imp.isExternal || false
      })),
      exports: exports.map(exp => ({
        name: exp.name,
        type: exp.type,
        isDefault: exp.isDefault || false
      }))
    };
  }

  /**
   * Complete analysis and update record
   */
  async completeAnalysis(analysisRecord, analysisResult, processingTime) {
    try {
      // Update the analysis record with results
      analysisRecord.functions = analysisResult.functions || [];
      analysisRecord.classes = analysisResult.classes || [];
      analysisRecord.imports = analysisResult.imports || [];
      analysisRecord.exports = analysisResult.exports || [];
      analysisRecord.syntaxErrors = analysisResult.syntaxErrors || [];
      analysisRecord.warnings = analysisResult.warnings || [];
      analysisRecord.metrics = analysisResult.metrics;
      analysisRecord.status = 'completed';
      analysisRecord.analyzedAt = new Date();
      analysisRecord.processingTime = Math.round(processingTime);

      // Store AST if requested
      if (analysisRecord.analysisOptions.includeAST && analysisResult.ast) {
        analysisRecord.ast = analysisResult.ast;
      }

      await analysisRecord.save();
      
      return analysisRecord;

    } catch (error) {
      console.error('Failed to complete analysis:', error);
      analysisRecord.status = 'failed';
      analysisRecord.syntaxErrors.push({
        message: `Analysis completion failed: ${error.message}`,
        line: 1,
        severity: 'error'
      });
      await analysisRecord.save();
      throw error;
    }
  }

  /**
   * Get analysis by ID
   */
  async getAnalysis(analysisId, userId) {
    const CodeAnalysisModel = getModel('CodeAnalysis');
    
    const analysis = await CodeAnalysisModel.findOne({
      _id: analysisId,
      userId
    });

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    return analysis;
  }

  /**
   * Get user's analysis history
   */
  async getUserAnalyses(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      language,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const CodeAnalysisModel = getModel('CodeAnalysis');
    
    const query = { userId };
    
    if (language) {
      query.language = language;
    }
    
    if (status) {
      query.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const analyses = await CodeAnalysisModel
      .find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-ast -code'); // Exclude large fields

    const total = await CodeAnalysisModel.countDocuments(query);

    return {
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Delete analysis
   */
  async deleteAnalysis(analysisId, userId) {
    const CodeAnalysisModel = getModel('CodeAnalysis');
    
    const result = await CodeAnalysisModel.deleteOne({
      _id: analysisId,
      userId
    });

    if (result.deletedCount === 0) {
      throw new Error('Analysis not found or unauthorized');
    }

    return { success: true };
  }

  /**
   * Get analytics for user
   */
  async getUserAnalytics(userId, timeRange = 30) {
    const CodeAnalysisModel = getModel('CodeAnalysis');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const analytics = await CodeAnalysisModel.aggregate([
      {
        $match: {
          userId: CodeAnalysisModel.base.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          completedAnalyses: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageComplexity: { $avg: '$metrics.cyclomaticComplexity' },
          languageDistribution: { $push: '$language' },
          totalFunctions: { $sum: { $size: '$functions' } },
          totalClasses: { $sum: { $size: '$classes' } },
          averageProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    return analytics.length > 0 ? analytics[0] : null;
  }
}

module.exports = new CodeAnalysisService();