const { performance } = require('perf_hooks');
const CodeAnalysisService = require('./codeAnalysisService');
const HuggingFaceService = require('./huggingFaceService');
const { getModel } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Test Generation Service
 * Orchestrates the complete test generation pipeline from code analysis to AI-generated tests
 */
class TestGenerationService {
  constructor() {
    this.supportedFrameworks = {
      javascript: ['jest', 'mocha', 'vitest', 'jasmine'],
      typescript: ['jest', 'mocha', 'vitest', 'jasmine'],
      python: ['pytest', 'unittest', 'nose2'],
      java: ['junit', 'testng', 'spock'],
      cpp: ['gtest', 'catch2', 'boost-test'],
      csharp: ['nunit', 'xunit', 'mstest']
    };

    this.defaultFrameworks = {
      javascript: 'jest',
      typescript: 'jest', 
      python: 'pytest',
      java: 'junit',
      cpp: 'gtest',
      csharp: 'nunit'
    };

    // Test generation templates
    this.testTemplates = {
      jest: {
        fileExtension: '.test.js',
        imports: (moduleName) => `const { ${moduleName} } = require('./${moduleName}');`,
        describe: (name) => `describe('${name}', () => {`,
        test: (name, body) => `  it('${name}', () => {\n${body}\n  });`,
        close: '});'
      },
      pytest: {
        fileExtension: '_test.py',
        imports: (moduleName) => `import pytest\nfrom ${moduleName} import *`,
        test: (name, body) => `def test_${name}():\n${body}`,
        asyncTest: (name, body) => `@pytest.mark.asyncio\nasync def test_${name}():\n${body}`
      },
      junit: {
        fileExtension: 'Test.java',
        imports: () => `import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;`,
        test: (name, body) => `  @Test\n  public void ${name}() {\n${body}\n  }`
      }
    };
  }

  /**
   * Generate comprehensive test cases for source code
   * @param {Object} options - Generation options
   * @param {string} options.code - Source code to generate tests for
   * @param {string} options.language - Programming language
   * @param {string} options.userId - User ID performing the operation
   * @param {string} options.fileName - Optional file name
   * @param {Object} options.generationOptions - Test generation configuration
   * @returns {Promise<Object>} Test generation result
   */
  async generateTests(options) {
    const startTime = performance.now();
    const {
      code,
      language,
      userId,
      fileName = 'unnamed',
      generationOptions = {}
    } = options;

    try {
      // Validate input
      this.validateInput(options);

      // Set default generation options
      const config = this.mergeGenerationOptions(generationOptions, language);

      // Step 1: Analyze the source code
      console.log('📊 Analyzing source code...');
      const analysisResult = await CodeAnalysisService.analyzeCode({
        code,
        language,
        userId,
        fileName,
        analysisOptions: {
          includeAST: false,
          includeMetrics: true,
          includeDependencies: true
        }
      });

      // Step 2: Create test generation record
      const testGeneration = await this.createTestGenerationRecord({
        userId,
        analysisId: analysisResult._id,
        language,
        framework: config.framework,
        options: config
      });

      // Step 3: Generate tests for each function/method
      console.log('🤖 Generating AI-powered test cases...');
      const generatedTests = await this.generateTestsForFunctions(
        analysisResult,
        config
      );

      // Step 4: Generate tests for classes
      if (analysisResult.classes.length > 0) {
        console.log('🏗️ Generating class-based tests...');
        const classTests = await this.generateTestsForClasses(
          analysisResult,
          config
        );
        generatedTests.push(...classTests);
      }

      // Step 5: Generate integration tests
      if (config.includeIntegrationTests) {
        console.log('🔗 Generating integration tests...');
        const integrationTests = await this.generateIntegrationTests(
          analysisResult,
          config
        );
        generatedTests.push(...integrationTests);
      }

      // Step 6: Post-process and organize tests
      const organizedTests = this.organizeTests(generatedTests, config);

      // Step 7: Generate test files
      const testFiles = this.generateTestFiles(organizedTests, config);

      // Step 8: Complete test generation record
      const completedGeneration = await this.completeTestGeneration(
        testGeneration,
        {
          tests: organizedTests,
          files: testFiles,
          metrics: this.calculateGenerationMetrics(generatedTests, analysisResult),
          processingTime: performance.now() - startTime
        }
      );

      return {
        id: completedGeneration._id,
        status: 'completed',
        tests: organizedTests,
        files: testFiles,
        metrics: completedGeneration.metrics,
        analysisId: analysisResult._id,
        processingTime: completedGeneration.processingTime
      };

    } catch (error) {
      console.error('Test generation failed:', error);
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  /**
   * Generate tests for individual functions
   */
  async generateTestsForFunctions(analysisResult, config) {
    const tests = [];
    const { functions, code, language } = analysisResult;

    for (const func of functions) {
      try {
        // Extract function code
        const functionCode = this.extractFunctionCode(code, func);

        // Generate AI-powered test cases
        const aiTests = await HuggingFaceService.generateTestCases({
          functionCode,
          language,
          testFramework: config.framework,
          functionInfo: func,
          generationOptions: config.aiOptions
        });

        // Generate template-based tests as fallback
        const templateTests = this.generateTemplateTests(func, config);

        // Combine and deduplicate
        const combinedTests = this.combineAndDeduplicateTests(aiTests, templateTests);

        tests.push({
          targetType: 'function',
          targetName: func.name,
          targetInfo: func,
          testCases: combinedTests
        });

      } catch (error) {
        console.warn(`Failed to generate tests for function ${func.name}:`, error.message);
        
        // Fallback to template-based generation
        const fallbackTests = this.generateTemplateTests(func, config);
        tests.push({
          targetType: 'function',
          targetName: func.name,
          targetInfo: func,
          testCases: fallbackTests
        });
      }
    }

    return tests;
  }

  /**
   * Generate tests for classes
   */
  async generateTestsForClasses(analysisResult, config) {
    const tests = [];
    const { classes, code, language } = analysisResult;

    for (const cls of classes) {
      try {
        // Extract class code
        const classCode = this.extractClassCode(code, cls);

        // Generate tests for the class as a whole
        const classTests = await HuggingFaceService.generateTestCases({
          functionCode: classCode,
          language,
          testFramework: config.framework,
          functionInfo: {
            name: cls.name,
            type: 'class',
            methods: cls.methods
          },
          generationOptions: config.aiOptions
        });

        // Generate tests for individual methods
        const methodTests = [];
        for (const method of cls.methods) {
          const methodCode = this.extractMethodCode(classCode, method);
          const methodTestCases = await HuggingFaceService.generateTestCases({
            functionCode: methodCode,
            language,
            testFramework: config.framework,
            functionInfo: method,
            generationOptions: config.aiOptions
          });
          methodTests.push(...methodTestCases);
        }

        tests.push({
          targetType: 'class',
          targetName: cls.name,
          targetInfo: cls,
          testCases: [...classTests, ...methodTests]
        });

      } catch (error) {
        console.warn(`Failed to generate tests for class ${cls.name}:`, error.message);
        
        // Fallback to method-only tests
        const methodTests = cls.methods.map(method => 
          this.generateTemplateTests(method, config)
        ).flat();

        tests.push({
          targetType: 'class',
          targetName: cls.name,
          targetInfo: cls,
          testCases: methodTests
        });
      }
    }

    return tests;
  }

  /**
   * Generate integration tests
   */
  async generateIntegrationTests(analysisResult, config) {
    const tests = [];

    try {
      // Identify integration test candidates
      const candidates = this.identifyIntegrationCandidates(analysisResult);

      for (const candidate of candidates) {
        const integrationTest = await HuggingFaceService.generateTestCases({
          functionCode: candidate.code,
          language: analysisResult.language,
          testFramework: config.framework,
          functionInfo: {
            name: candidate.name,
            type: 'integration',
            dependencies: candidate.dependencies
          },
          generationOptions: {
            ...config.aiOptions,
            focus: 'integration'
          }
        });

        tests.push({
          targetType: 'integration',
          targetName: candidate.name,
          targetInfo: candidate,
          testCases: integrationTest
        });
      }

    } catch (error) {
      console.warn('Failed to generate integration tests:', error.message);
    }

    return tests;
  }

  /**
   * Generate template-based tests as fallback
   */
  generateTemplateTests(functionInfo, config) {
    const tests = [];
    const { framework, language } = config;

    // Basic success test
    tests.push({
      id: uuidv4(),
      name: `should call ${functionInfo.name} successfully`,
      type: 'unit',
      code: this.generateBasicTest(functionInfo, framework, language),
      description: 'Basic success path test',
      framework
    });

    // Parameter validation tests
    if (functionInfo.parameters && functionInfo.parameters.length > 0) {
      tests.push({
        id: uuidv4(),
        name: `should handle invalid parameters for ${functionInfo.name}`,
        type: 'unit',
        code: this.generateParameterTest(functionInfo, framework, language),
        description: 'Parameter validation test',
        framework
      });
    }

    // Error handling tests
    if (functionInfo.complexity > 3) {
      tests.push({
        id: uuidv4(),
        name: `should handle errors in ${functionInfo.name}`,
        type: 'error-handling',
        code: this.generateErrorTest(functionInfo, framework, language),
        description: 'Error handling test',
        framework
      });
    }

    return tests;
  }

  /**
   * Generate basic success test
   */
  generateBasicTest(functionInfo, framework, language) {
    const template = this.testTemplates[framework];
    if (!template) return '';

    const params = this.generateTestParameters(functionInfo.parameters);
    const assertion = this.generateAssertion(functionInfo, framework);

    if (framework === 'jest') {
      return `    const result = ${functionInfo.name}(${params});
    ${assertion}`;
    } else if (framework === 'pytest') {
      return `    result = ${functionInfo.name}(${params})
    ${assertion}`;
    } else if (framework === 'junit') {
      return `    ${functionInfo.returnType} result = ${functionInfo.name}(${params});
    ${assertion}`;
    }

    return '';
  }

  /**
   * Generate parameter validation test
   */
  generateParameterTest(functionInfo, framework, language) {
    if (framework === 'jest') {
      return `    expect(() => ${functionInfo.name}(null)).toThrow();`;
    } else if (framework === 'pytest') {
      return `    with pytest.raises(Exception):
        ${functionInfo.name}(None)`;
    } else if (framework === 'junit') {
      return `    assertThrows(IllegalArgumentException.class, () -> ${functionInfo.name}(null));`;
    }

    return '';
  }

  /**
   * Generate error handling test
   */
  generateErrorTest(functionInfo, framework, language) {
    if (framework === 'jest') {
      return `    expect(() => ${functionInfo.name}()).toThrow();`;
    } else if (framework === 'pytest') {
      return `    with pytest.raises(Exception):
        ${functionInfo.name}()`;
    } else if (framework === 'junit') {
      return `    assertThrows(Exception.class, () -> ${functionInfo.name}());`;
    }

    return '';
  }

  /**
   * Generate test parameters
   */
  generateTestParameters(parameters) {
    if (!parameters || parameters.length === 0) return '';

    return parameters.map(param => {
      switch (param.type) {
        case 'string': return '"test"';
        case 'number': return '42';
        case 'boolean': return 'true';
        case 'array': return '[]';
        case 'object': return '{}';
        default: return 'null';
      }
    }).join(', ');
  }

  /**
   * Generate assertion
   */
  generateAssertion(functionInfo, framework) {
    if (framework === 'jest') {
      return `expect(result).toBeDefined();`;
    } else if (framework === 'pytest') {
      return `assert result is not None`;
    } else if (framework === 'junit') {
      return `assertNotNull(result);`;
    }

    return '';
  }

  /**
   * Combine and deduplicate tests
   */
  combineAndDeduplicateTests(aiTests, templateTests) {
    const combined = [...aiTests, ...templateTests];
    const seen = new Set();
    
    return combined.filter(test => {
      const key = `${test.name}-${test.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Organize tests by type and target
   */
  organizeTests(tests, config) {
    const organized = {
      unit: [],
      integration: [],
      errorHandling: [],
      performance: [],
      summary: {
        totalTests: 0,
        totalFiles: 0,
        coverage: {
          functions: 0,
          classes: 0,
          lines: 0
        }
      }
    };

    tests.forEach(testGroup => {
      testGroup.testCases.forEach(test => {
        organized[test.type] = organized[test.type] || [];
        organized[test.type].push({
          ...test,
          target: testGroup.targetName,
          targetType: testGroup.targetType
        });
        organized.summary.totalTests++;
      });
    });

    return organized;
  }

  /**
   * Generate test files
   */
  generateTestFiles(organizedTests, config) {
    const files = [];
    const template = this.testTemplates[config.framework];

    // Group tests by target
    const testsByTarget = {};
    Object.values(organizedTests).forEach(tests => {
      if (Array.isArray(tests)) {
        tests.forEach(test => {
          if (!testsByTarget[test.target]) {
            testsByTarget[test.target] = [];
          }
          testsByTarget[test.target].push(test);
        });
      }
    });

    // Generate file for each target
    Object.entries(testsByTarget).forEach(([target, tests]) => {
      const fileName = `${target}${template.fileExtension}`;
      const fileContent = this.generateTestFileContent(target, tests, config);
      
      files.push({
        name: fileName,
        content: fileContent,
        language: config.language,
        framework: config.framework,
        testCount: tests.length
      });
    });

    return files;
  }

  /**
   * Generate test file content
   */
  generateTestFileContent(target, tests, config) {
    const template = this.testTemplates[config.framework];
    let content = '';

    // Add imports
    if (template.imports) {
      content += template.imports(target) + '\n\n';
    }

    // Add describe block for Jest/Mocha
    if (template.describe) {
      content += template.describe(target) + '\n';
    }

    // Add individual tests
    tests.forEach(test => {
      if (template.test) {
        content += template.test(test.name, test.code) + '\n\n';
      }
    });

    // Close describe block
    if (template.close) {
      content += template.close + '\n';
    }

    return content;
  }

  /**
   * Validate input parameters
   */
  validateInput(options) {
    const { code, language, userId } = options;

    if (!code || typeof code !== 'string') {
      throw new Error('Code is required and must be a string');
    }

    if (!language || !this.supportedFrameworks[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }

    if (!userId) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Merge generation options with defaults
   */
  mergeGenerationOptions(userOptions, language) {
    const defaults = {
      framework: this.defaultFrameworks[language],
      includeIntegrationTests: true,
      includePerformanceTests: false,
      includeErrorHandling: true,
      maxTestsPerFunction: 5,
      aiOptions: {
        maxTokens: 2048,
        temperature: 0.7,
        numTests: 3
      }
    };

    return {
      ...defaults,
      ...userOptions,
      language,
      aiOptions: {
        ...defaults.aiOptions,
        ...userOptions.aiOptions
      }
    };
  }

  /**
   * Extract function code from source
   */
  extractFunctionCode(sourceCode, functionInfo) {
    const lines = sourceCode.split('\n');
    const start = Math.max(0, functionInfo.startLine - 1);
    const end = Math.min(lines.length, functionInfo.endLine);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract class code from source
   */
  extractClassCode(sourceCode, classInfo) {
    const lines = sourceCode.split('\n');
    const start = Math.max(0, classInfo.startLine - 1);
    const end = Math.min(lines.length, classInfo.endLine);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract method code from class
   */
  extractMethodCode(classCode, methodInfo) {
    const lines = classCode.split('\n');
    const start = Math.max(0, methodInfo.startLine - 1);
    const end = Math.min(lines.length, methodInfo.endLine);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Identify integration test candidates
   */
  identifyIntegrationCandidates(analysisResult) {
    const candidates = [];
    
    // Functions with external dependencies
    analysisResult.functions.forEach(func => {
      if (func.dependencies && func.dependencies.length > 2) {
        candidates.push({
          name: `${func.name}_integration`,
          type: 'function',
          code: this.extractFunctionCode(analysisResult.code, func),
          dependencies: func.dependencies
        });
      }
    });

    // Classes with multiple dependencies
    analysisResult.classes.forEach(cls => {
      const allDependencies = cls.methods.reduce((deps, method) => 
        deps.concat(method.dependencies || []), []
      );
      
      if (allDependencies.length > 3) {
        candidates.push({
          name: `${cls.name}_integration`,
          type: 'class',
          code: this.extractClassCode(analysisResult.code, cls),
          dependencies: [...new Set(allDependencies)]
        });
      }
    });

    return candidates;
  }

  /**
   * Calculate generation metrics
   */
  calculateGenerationMetrics(tests, analysisResult) {
    const totalTests = tests.reduce((sum, group) => sum + group.testCases.length, 0);
    const totalFunctions = analysisResult.functions.length;
    const totalClasses = analysisResult.classes.length;

    return {
      totalTests,
      totalTargets: totalFunctions + totalClasses,
      coverage: {
        functions: totalFunctions > 0 ? (tests.filter(t => t.targetType === 'function').length / totalFunctions) * 100 : 0,
        classes: totalClasses > 0 ? (tests.filter(t => t.targetType === 'class').length / totalClasses) * 100 : 0
      },
      testTypes: {
        unit: tests.reduce((sum, group) => sum + group.testCases.filter(t => t.type === 'unit').length, 0),
        integration: tests.reduce((sum, group) => sum + group.testCases.filter(t => t.type === 'integration').length, 0),
        errorHandling: tests.reduce((sum, group) => sum + group.testCases.filter(t => t.type === 'error-handling').length, 0)
      }
    };
  }

  /**
   * Create test generation record
   */
  async createTestGenerationRecord(options) {
    const TestGenerationModel = getModel('TestGeneration');
    
    const record = new TestGenerationModel({
      userId: options.userId,
      analysisId: options.analysisId,
      language: options.language,
      framework: options.framework,
      status: 'processing',
      options: options.options,
      createdAt: new Date()
    });

    return await record.save();
  }

  /**
   * Complete test generation record
   */
  async completeTestGeneration(record, results) {
    record.status = 'completed';
    record.completedAt = new Date();
    record.processingTime = results.processingTime;
    record.testCases = results.tests;
    record.generatedFiles = results.files;
    record.metrics = results.metrics;

    return await record.save();
  }

  /**
   * Get supported frameworks for a language
   */
  getSupportedFrameworks(language) {
    return this.supportedFrameworks[language] || [];
  }

  /**
   * Get test generation by ID
   */
  async getTestGeneration(id, userId) {
    const TestGenerationModel = getModel('TestGeneration');
    
    const generation = await TestGenerationModel.findOne({
      _id: id,
      userId
    }).populate('analysisId');

    if (!generation) {
      throw new Error('Test generation not found');
    }

    return generation;
  }

  /**
   * Get user's test generations
   */
  async getUserGenerations(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      language,
      framework,
      status
    } = options;

    const TestGenerationModel = getModel('TestGeneration');
    
    const query = { userId };
    
    if (language) query.language = language;
    if (framework) query.framework = framework;
    if (status) query.status = status;

    const generations = await TestGenerationModel
      .find(query)
      .populate('analysisId', 'fileName language createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TestGenerationModel.countDocuments(query);

    return {
      generations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new TestGenerationService();