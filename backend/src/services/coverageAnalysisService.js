const { performance } = require('perf_hooks');
const { getModel } = require('../models');

/**
 * Coverage Analysis Engine
 * Simulates test coverage and identifies gaps in testing
 */
class CoverageAnalysisService {
  constructor() {
    this.coverageTypes = {
      line: 'Line Coverage',
      branch: 'Branch Coverage', 
      function: 'Function Coverage',
      statement: 'Statement Coverage',
      condition: 'Condition Coverage'
    };

    // Coverage thresholds
    this.thresholds = {
      excellent: 90,
      good: 80,
      fair: 70,
      poor: 50
    };
  }

  /**
   * Analyze test coverage for code and generated tests
   * @param {Object} options - Analysis options
   * @param {Object} options.analysisResult - Code analysis result
   * @param {Object} options.testGeneration - Test generation result
   * @param {string} options.userId - User ID
   * @param {Object} options.coverageOptions - Coverage analysis configuration
   * @returns {Promise<Object>} Coverage analysis result
   */
  async analyzeCoverage(options) {
    const startTime = performance.now();
    const {
      analysisResult,
      testGeneration,
      userId,
      coverageOptions = {}
    } = options;

    try {
      // Validate input
      this.validateInput(options);

      // Create coverage report record
      const coverageReport = await this.createCoverageReport({
        userId,
        analysisId: analysisResult._id,
        testGenerationId: testGeneration.id,
        options: coverageOptions
      });

      // Step 1: Analyze line coverage
      console.log('📊 Analyzing line coverage...');
      const lineCoverage = this.analyzeLineCoverage(analysisResult, testGeneration);

      // Step 2: Analyze branch coverage
      console.log('🌳 Analyzing branch coverage...');
      const branchCoverage = this.analyzeBranchCoverage(analysisResult, testGeneration);

      // Step 3: Analyze function coverage
      console.log('⚡ Analyzing function coverage...');
      const functionCoverage = this.analyzeFunctionCoverage(analysisResult, testGeneration);

      // Step 4: Analyze statement coverage
      console.log('📝 Analyzing statement coverage...');
      const statementCoverage = this.analyzeStatementCoverage(analysisResult, testGeneration);

      // Step 5: Identify coverage gaps
      console.log('🔍 Identifying coverage gaps...');
      const coverageGaps = this.identifyCoverageGaps(
        analysisResult,
        testGeneration,
        { lineCoverage, branchCoverage, functionCoverage, statementCoverage }
      );

      // Step 6: Generate improvement suggestions
      console.log('💡 Generating improvement suggestions...');
      const improvements = this.generateImprovementSuggestions(
        coverageGaps,
        analysisResult,
        testGeneration
      );

      // Step 7: Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics({
        lineCoverage,
        branchCoverage,
        functionCoverage,
        statementCoverage
      });

      // Step 8: Complete coverage report
      const completedReport = await this.completeCoverageReport(
        coverageReport,
        {
          lineCoverage,
          branchCoverage,
          functionCoverage,
          statementCoverage,
          gaps: coverageGaps,
          improvements,
          overallMetrics,
          processingTime: performance.now() - startTime
        }
      );

      return {
        id: completedReport._id,
        status: 'completed',
        coverage: {
          line: lineCoverage,
          branch: branchCoverage,
          function: functionCoverage,
          statement: statementCoverage
        },
        gaps: coverageGaps,
        improvements,
        metrics: overallMetrics,
        processingTime: completedReport.processingTime
      };

    } catch (error) {
      console.error('Coverage analysis failed:', error);
      throw new Error(`Coverage analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze line coverage
   */
  analyzeLineCoverage(analysisResult, testGeneration) {
    const { code, functions, classes } = analysisResult;
    const lines = code.split('\n');
    const totalLines = lines.length;
    
    // Identify executable lines (excluding comments and empty lines)
    const executableLines = this.identifyExecutableLines(lines, analysisResult.language);
    
    // Simulate coverage based on generated tests
    const coveredLines = this.simulateLineCoverage(
      executableLines,
      functions,
      classes,
      testGeneration
    );

    const coverage = {
      total: executableLines.length,
      covered: coveredLines.length,
      percentage: executableLines.length > 0 ? (coveredLines.length / executableLines.length) * 100 : 0,
      uncoveredLines: executableLines.filter(line => !coveredLines.includes(line)),
      details: {
        executableLines,
        coveredLines,
        totalLines
      }
    };

    return coverage;
  }

  /**
   * Analyze branch coverage
   */
  analyzeBranchCoverage(analysisResult, testGeneration) {
    const { functions, classes } = analysisResult;
    const branches = this.identifyBranches(functions, classes, analysisResult.code);
    
    // Simulate branch coverage based on test cases
    const coveredBranches = this.simulateBranchCoverage(branches, testGeneration);

    return {
      total: branches.length,
      covered: coveredBranches.length,
      percentage: branches.length > 0 ? (coveredBranches.length / branches.length) * 100 : 0,
      uncoveredBranches: branches.filter(branch => 
        !coveredBranches.some(covered => covered.id === branch.id)
      ),
      details: {
        branches,
        coveredBranches
      }
    };
  }

  /**
   * Analyze function coverage
   */
  analyzeFunctionCoverage(analysisResult, testGeneration) {
    const { functions, classes } = analysisResult;
    const allFunctions = [...functions];
    
    // Add class methods to function list
    classes.forEach(cls => {
      allFunctions.push(...cls.methods.map(method => ({
        ...method,
        className: cls.name,
        isMethod: true
      })));
    });

    // Determine which functions have tests
    const testedFunctions = this.identifyTestedFunctions(allFunctions, testGeneration);

    return {
      total: allFunctions.length,
      covered: testedFunctions.length,
      percentage: allFunctions.length > 0 ? (testedFunctions.length / allFunctions.length) * 100 : 0,
      untestedFunctions: allFunctions.filter(func => 
        !testedFunctions.some(tested => tested.name === func.name)
      ),
      details: {
        allFunctions: allFunctions.map(f => ({ name: f.name, tested: testedFunctions.some(t => t.name === f.name) })),
        testedFunctions
      }
    };
  }

  /**
   * Analyze statement coverage
   */
  analyzeStatementCoverage(analysisResult, testGeneration) {
    const { code, functions, classes } = analysisResult;
    const statements = this.identifyStatements(code, analysisResult.language);
    
    // Simulate statement coverage
    const coveredStatements = this.simulateStatementCoverage(
      statements,
      functions,
      classes,
      testGeneration
    );

    return {
      total: statements.length,
      covered: coveredStatements.length,
      percentage: statements.length > 0 ? (coveredStatements.length / statements.length) * 100 : 0,
      uncoveredStatements: statements.filter(stmt => 
        !coveredStatements.some(covered => covered.line === stmt.line)
      ),
      details: {
        statements,
        coveredStatements
      }
    };
  }

  /**
   * Identify executable lines
   */
  identifyExecutableLines(lines, language) {
    const executableLines = [];
    
    const commentPatterns = {
      javascript: /^\s*(\/\/|\/\*|\*\/|\*\s)/,
      typescript: /^\s*(\/\/|\/\*|\*\/|\*\s)/,
      python: /^\s*#/,
      java: /^\s*(\/\/|\/\*|\*\/|\*\s)/,
      cpp: /^\s*(\/\/|\/\*|\*\/|\*\s)/,
      csharp: /^\s*(\/\/|\/\*|\*\/|\*\s|\/\/\/)/
    };

    const commentPattern = commentPatterns[language] || commentPatterns.javascript;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (trimmed && !commentPattern.test(trimmed)) {
        // Skip certain non-executable lines
        if (!this.isNonExecutableLine(trimmed, language)) {
          executableLines.push(index + 1);
        }
      }
    });

    return executableLines;
  }

  /**
   * Check if line is non-executable
   */
  isNonExecutableLine(line, language) {
    const nonExecutablePatterns = {
      javascript: [
        /^(import|export)\s/,
        /^(const|let|var)\s+\w+\s*=\s*require/,
        /^module\.exports/,
        /^\/\*\*?/, // JSDoc
        /^\*/, // JSDoc continuation
        /^\*\//  // JSDoc end
      ],
      python: [
        /^import\s/,
        /^from\s.*import/,
        /^class\s+\w+.*:$/,
        /^def\s+\w+.*:$/,
        /^"""/, // Docstring
        /^'''/  // Docstring
      ],
      java: [
        /^import\s/,
        /^package\s/,
        /^public\s+class\s/,
        /^private\s+class\s/,
        /^\/\*\*/, // JavaDoc
        /^\*/      // JavaDoc continuation
      ]
    };

    const patterns = nonExecutablePatterns[language] || [];
    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Simulate line coverage based on tests
   */
  simulateLineCoverage(executableLines, functions, classes, testGeneration) {
    const coveredLines = new Set();

    // For each test case, estimate which lines it would cover
    testGeneration.tests.unit.forEach(test => {
      const targetFunction = this.findTargetFunction(test.target, functions, classes);
      if (targetFunction) {
        // Add lines from the target function
        for (let line = targetFunction.startLine; line <= targetFunction.endLine; line++) {
          if (executableLines.includes(line)) {
            coveredLines.add(line);
          }
        }

        // Add coverage based on test type
        if (test.type === 'error-handling') {
          // Error handling tests might cover additional error paths
          this.addErrorPathCoverage(targetFunction, executableLines, coveredLines);
        }
      }
    });

    // Integration tests cover more lines
    testGeneration.tests.integration?.forEach(test => {
      const targetFunction = this.findTargetFunction(test.target, functions, classes);
      if (targetFunction && targetFunction.dependencies) {
        // Cover dependencies as well
        targetFunction.dependencies.forEach(dep => {
          const depFunction = this.findFunctionByName(dep, functions, classes);
          if (depFunction) {
            for (let line = depFunction.startLine; line <= depFunction.endLine; line++) {
              if (executableLines.includes(line)) {
                coveredLines.add(line);
              }
            }
          }
        });
      }
    });

    return Array.from(coveredLines);
  }

  /**
   * Identify branches in code
   */
  identifyBranches(functions, classes, code) {
    const branches = [];
    const lines = code.split('\n');

    // Find conditional statements
    const branchPatterns = {
      if: /\bif\s*\(/,
      else: /\belse\b/,
      elseif: /\belse\s+if\s*\(/,
      switch: /\bswitch\s*\(/,
      case: /\bcase\s+/,
      ternary: /\?\s*.*:/,
      and: /&&/,
      or: /\|\|/
    };

    lines.forEach((line, index) => {
      Object.entries(branchPatterns).forEach(([type, pattern]) => {
        if (pattern.test(line)) {
          branches.push({
            id: `${type}_${index + 1}`,
            type,
            line: index + 1,
            content: line.trim(),
            covered: false
          });
        }
      });
    });

    return branches;
  }

  /**
   * Simulate branch coverage
   */
  simulateBranchCoverage(branches, testGeneration) {
    const coveredBranches = [];

    // Different test types cover different branches
    const coverageRates = {
      'unit': 0.6,           // Unit tests cover 60% of branches
      'error-handling': 0.8,  // Error tests cover 80% of conditional branches
      'integration': 0.7,     // Integration tests cover 70% of branches
      'edge-case': 0.9       // Edge case tests cover 90% of branches
    };

    Object.entries(testGeneration.tests).forEach(([testType, tests]) => {
      if (Array.isArray(tests)) {
        const coverageRate = coverageRates[testType] || 0.5;
        const branchesToCover = Math.floor(branches.length * coverageRate);
        
        // Simulate covering branches
        branches.slice(0, branchesToCover).forEach(branch => {
          if (!coveredBranches.some(cb => cb.id === branch.id)) {
            coveredBranches.push({ ...branch, covered: true, coveredBy: testType });
          }
        });
      }
    });

    return coveredBranches;
  }

  /**
   * Identify tested functions
   */
  identifyTestedFunctions(allFunctions, testGeneration) {
    const testedFunctions = [];

    // Check each test to see which function it targets
    Object.values(testGeneration.tests).forEach(tests => {
      if (Array.isArray(tests)) {
        tests.forEach(test => {
          const targetFunction = allFunctions.find(func => 
            func.name === test.target || 
            test.name.toLowerCase().includes(func.name.toLowerCase())
          );
          
          if (targetFunction && !testedFunctions.some(tf => tf.name === targetFunction.name)) {
            testedFunctions.push(targetFunction);
          }
        });
      }
    });

    return testedFunctions;
  }

  /**
   * Identify statements in code
   */
  identifyStatements(code, language) {
    const statements = [];
    const lines = code.split('\n');

    const statementPatterns = {
      javascript: /[;{}]$/,
      python: /:$/,
      java: /[;{}]$/,
      cpp: /[;{}]$/,
      csharp: /[;{}]$/
    };

    const pattern = statementPatterns[language] || statementPatterns.javascript;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && pattern.test(trimmed)) {
        statements.push({
          line: index + 1,
          content: trimmed,
          type: this.identifyStatementType(trimmed, language)
        });
      }
    });

    return statements;
  }

  /**
   * Identify statement type
   */
  identifyStatementType(statement, language) {
    if (/\bif\s*\(/.test(statement)) return 'conditional';
    if (/\bfor\s*\(/.test(statement)) return 'loop';
    if (/\bwhile\s*\(/.test(statement)) return 'loop';
    if (/\breturn\b/.test(statement)) return 'return';
    if (/\bthrow\b/.test(statement)) return 'throw';
    if (/\btry\s*{/.test(statement)) return 'try';
    if (/\bcatch\s*\(/.test(statement)) return 'catch';
    return 'assignment';
  }

  /**
   * Simulate statement coverage
   */
  simulateStatementCoverage(statements, functions, classes, testGeneration) {
    const covered = [];

    // Simulate coverage based on function coverage
    const totalTests = Object.values(testGeneration.tests).reduce((sum, tests) => 
      Array.isArray(tests) ? sum + tests.length : sum, 0
    );

    // Higher test count = better coverage
    const baseCoverageRate = Math.min(0.9, 0.4 + (totalTests * 0.05));

    statements.forEach(statement => {
      let coverageProbability = baseCoverageRate;

      // Adjust probability based on statement type
      switch (statement.type) {
        case 'conditional':
          coverageProbability *= 0.8; // Harder to cover all conditions
          break;
        case 'loop':
          coverageProbability *= 0.7; // Loops might not be fully tested
          break;
        case 'throw':
          coverageProbability *= 0.6; // Error paths less likely to be covered
          break;
        case 'catch':
          coverageProbability *= 0.5; // Exception handling often missed
          break;
        default:
          coverageProbability *= 1.0;
      }

      if (Math.random() < coverageProbability) {
        covered.push(statement);
      }
    });

    return covered;
  }

  /**
   * Identify coverage gaps
   */
  identifyCoverageGaps(analysisResult, testGeneration, coverageResults) {
    const gaps = {
      critical: [],
      major: [],
      minor: [],
      suggestions: []
    };

    // Critical gaps: No tests for complex functions
    const untestedComplexFunctions = coverageResults.functionCoverage.untestedFunctions
      .filter(func => func.complexity > 5);
    
    untestedComplexFunctions.forEach(func => {
      gaps.critical.push({
        type: 'untested_complex_function',
        target: func.name,
        severity: 'critical',
        description: `Complex function "${func.name}" (complexity: ${func.complexity}) has no tests`,
        recommendation: `Add comprehensive unit tests covering all execution paths`
      });
    });

    // Major gaps: Low branch coverage
    if (coverageResults.branchCoverage.percentage < 70) {
      gaps.major.push({
        type: 'low_branch_coverage',
        target: 'overall',
        severity: 'major',
        description: `Branch coverage is only ${coverageResults.branchCoverage.percentage.toFixed(1)}%`,
        recommendation: 'Add tests for conditional statements and error handling'
      });
    }

    // Minor gaps: Missing error handling tests
    const functionsWithoutErrorTests = this.findFunctionsWithoutErrorTests(
      analysisResult,
      testGeneration
    );

    functionsWithoutErrorTests.forEach(func => {
      gaps.minor.push({
        type: 'missing_error_tests',
        target: func.name,
        severity: 'minor',
        description: `Function "${func.name}" lacks error handling tests`,
        recommendation: 'Add tests for invalid inputs and edge cases'
      });
    });

    return gaps;
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(gaps, analysisResult, testGeneration) {
    const suggestions = [];

    // Group gaps by type and create actionable suggestions
    const gapsByType = {};
    [...gaps.critical, ...gaps.major, ...gaps.minor].forEach(gap => {
      gapsByType[gap.type] = gapsByType[gap.type] || [];
      gapsByType[gap.type].push(gap);
    });

    // Generate specific suggestions
    Object.entries(gapsByType).forEach(([type, typeGaps]) => {
      switch (type) {
        case 'untested_complex_function':
          suggestions.push({
            priority: 'high',
            title: 'Add tests for complex functions',
            description: `${typeGaps.length} complex function(s) need comprehensive testing`,
            actions: typeGaps.map(gap => ({
              action: 'create_test',
              target: gap.target,
              testTypes: ['unit', 'edge-case', 'error-handling']
            })),
            estimatedEffort: 'medium',
            impactOnCoverage: 'high'
          });
          break;

        case 'low_branch_coverage':
          suggestions.push({
            priority: 'medium',
            title: 'Improve branch coverage',
            description: 'Add tests for conditional statements and logical branches',
            actions: [{
              action: 'add_conditional_tests',
              target: 'all_functions',
              focus: 'if_else_statements'
            }],
            estimatedEffort: 'high',
            impactOnCoverage: 'high'
          });
          break;

        case 'missing_error_tests':
          suggestions.push({
            priority: 'low',
            title: 'Add error handling tests',
            description: `${typeGaps.length} function(s) need error handling tests`,
            actions: typeGaps.map(gap => ({
              action: 'create_error_test',
              target: gap.target,
              testTypes: ['error-handling']
            })),
            estimatedEffort: 'low',
            impactOnCoverage: 'medium'
          });
          break;
      }
    });

    return suggestions;
  }

  /**
   * Calculate overall coverage metrics
   */
  calculateOverallMetrics(coverageResults) {
    const { lineCoverage, branchCoverage, functionCoverage, statementCoverage } = coverageResults;

    // Weighted average (line coverage is most important)
    const weights = {
      line: 0.4,
      branch: 0.25,
      function: 0.2,
      statement: 0.15
    };

    const overallPercentage = 
      (lineCoverage.percentage * weights.line) +
      (branchCoverage.percentage * weights.branch) +
      (functionCoverage.percentage * weights.function) +
      (statementCoverage.percentage * weights.statement);

    // Determine quality rating
    let quality = 'poor';
    if (overallPercentage >= this.thresholds.excellent) quality = 'excellent';
    else if (overallPercentage >= this.thresholds.good) quality = 'good';
    else if (overallPercentage >= this.thresholds.fair) quality = 'fair';

    return {
      overall: {
        percentage: overallPercentage,
        quality,
        grade: this.calculateGrade(overallPercentage)
      },
      breakdown: {
        line: { percentage: lineCoverage.percentage, covered: lineCoverage.covered, total: lineCoverage.total },
        branch: { percentage: branchCoverage.percentage, covered: branchCoverage.covered, total: branchCoverage.total },
        function: { percentage: functionCoverage.percentage, covered: functionCoverage.covered, total: functionCoverage.total },
        statement: { percentage: statementCoverage.percentage, covered: statementCoverage.covered, total: statementCoverage.total }
      },
      recommendations: this.generateCoverageRecommendations(overallPercentage, coverageResults)
    };
  }

  /**
   * Calculate letter grade
   */
  calculateGrade(percentage) {
    if (percentage >= 95) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 85) return 'B+';
    if (percentage >= 80) return 'B';
    if (percentage >= 75) return 'C+';
    if (percentage >= 70) return 'C';
    if (percentage >= 65) return 'D+';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate coverage recommendations
   */
  generateCoverageRecommendations(overallPercentage, coverageResults) {
    const recommendations = [];

    if (overallPercentage < this.thresholds.fair) {
      recommendations.push('Focus on basic unit tests for all functions');
      recommendations.push('Add tests for main execution paths');
    }

    if (coverageResults.branchCoverage.percentage < 70) {
      recommendations.push('Improve branch coverage by testing conditional logic');
    }

    if (coverageResults.functionCoverage.percentage < 80) {
      recommendations.push('Ensure all public functions have at least one test');
    }

    if (overallPercentage > this.thresholds.good) {
      recommendations.push('Consider adding performance and integration tests');
      recommendations.push('Focus on edge cases and error conditions');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  findTargetFunction(targetName, functions, classes) {
    // Look in functions first
    let target = functions.find(func => func.name === targetName);
    
    // Then look in class methods
    if (!target) {
      for (const cls of classes) {
        target = cls.methods.find(method => method.name === targetName);
        if (target) break;
      }
    }

    return target;
  }

  findFunctionByName(name, functions, classes) {
    return this.findTargetFunction(name, functions, classes);
  }

  findFunctionsWithoutErrorTests(analysisResult, testGeneration) {
    const functionsWithErrorTests = new Set();
    
    // Find functions that have error handling tests
    testGeneration.tests.errorHandling?.forEach(test => {
      functionsWithErrorTests.add(test.target);
    });

    // Return functions without error tests
    return analysisResult.functions.filter(func => 
      !functionsWithErrorTests.has(func.name) && func.complexity > 2
    );
  }

  addErrorPathCoverage(targetFunction, executableLines, coveredLines) {
    // Simulate covering error paths (typically conditional statements)
    for (let line = targetFunction.startLine; line <= targetFunction.endLine; line++) {
      if (executableLines.includes(line)) {
        // 70% chance to cover error path lines
        if (Math.random() < 0.7) {
          coveredLines.add(line);
        }
      }
    }
  }

  /**
   * Database operations
   */
  async createCoverageReport(options) {
    const CoverageReportModel = getModel('CoverageReport');
    
    const report = new CoverageReportModel({
      userId: options.userId,
      analysisId: options.analysisId,
      testGenerationId: options.testGenerationId,
      status: 'processing',
      options: options.options,
      createdAt: new Date()
    });

    return await report.save();
  }

  async completeCoverageReport(report, results) {
    report.status = 'completed';
    report.completedAt = new Date();
    report.processingTime = results.processingTime;
    report.coverageData = {
      line: results.lineCoverage,
      branch: results.branchCoverage,
      function: results.functionCoverage,
      statement: results.statementCoverage
    };
    report.gaps = results.gaps;
    report.improvements = results.improvements;
    report.metrics = results.overallMetrics;

    return await report.save();
  }

  validateInput(options) {
    const { analysisResult, testGeneration, userId } = options;

    if (!analysisResult || !analysisResult._id) {
      throw new Error('Valid analysis result is required');
    }

    if (!testGeneration || !testGeneration.tests) {
      throw new Error('Valid test generation result is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Get coverage report by ID
   */
  async getCoverageReport(id, userId) {
    const CoverageReportModel = getModel('CoverageReport');
    
    const report = await CoverageReportModel.findOne({
      _id: id,
      userId
    }).populate(['analysisId', 'testGenerationId']);

    if (!report) {
      throw new Error('Coverage report not found');
    }

    return report;
  }
}

module.exports = new CoverageAnalysisService();