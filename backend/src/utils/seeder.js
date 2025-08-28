const models = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Database seeder for development and testing
 */
class DatabaseSeeder {
  constructor() {
    this.models = models;
  }

  /**
   * Seed all data
   */
  async seedAll() {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.seedUsers();
      await this.seedCodeAnalyses();
      await this.seedTestGenerations();
      await this.seedCoverageReports();
      
      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed users
   */
  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const users = [
      {
        email: 'admin@ai-test-generator.com',
        name: 'System Administrator',
        password: 'AdminPassword123!',
        role: 'admin',
        emailVerified: true,
        preferences: {
          theme: 'dark',
          defaultLanguage: 'typescript',
          defaultFramework: 'jest'
        },
        subscription: {
          plan: 'enterprise'
        }
      },
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        password: 'UserPassword123!',
        role: 'user',
        emailVerified: true,
        aiUsage: {
          daily: 5,
          monthly: 25,
          total: 150,
          lastReset: new Date()
        },
        analytics: {
          totalCodeAnalyses: 12,
          totalTestsGenerated: 8,
          totalCoverageReports: 5,
          averageCodeComplexity: 7.5
        }
      },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        password: 'UserPassword123!',
        role: 'premium',
        emailVerified: true,
        subscription: {
          plan: 'premium',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        },
        preferences: {
          theme: 'light',
          defaultLanguage: 'python',
          defaultFramework: 'pytest'
        },
        aiUsage: {
          daily: 15,
          monthly: 120,
          total: 450,
          lastReset: new Date()
        }
      }
    ];

    if (models.isMongoDB()) {
      // MongoDB seeding
      for (const userData of users) {
        const existingUser = await models.User.findOne({ email: userData.email });
        if (!existingUser) {
          await models.User.create(userData);
          console.log(`  ✓ Created user: ${userData.email}`);
        }
      }
    } else {
      // PostgreSQL seeding
      for (const userData of users) {
        const [user, created] = await models.User.findOrCreate({
          where: { email: userData.email },
          defaults: userData
        });
        if (created) {
          console.log(`  ✓ Created user: ${userData.email}`);
        }
      }
    }
  }

  /**
   * Seed code analyses
   */
  async seedCodeAnalyses() {
    console.log('📊 Seeding code analyses...');
    
    // Get a user to associate with analyses
    const user = models.isMongoDB() 
      ? await models.User.findOne({ email: 'john.doe@example.com' })
      : await models.User.findOne({ where: { email: 'john.doe@example.com' } });
    
    if (!user) {
      console.log('  ⚠️ No user found for code analyses seeding');
      return;
    }

    const codeAnalyses = [
      {
        userId: user.id,
        code: `
function calculateSum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

function calculateProduct(a, b) {
  return a * b;
}

module.exports = { calculateSum, calculateProduct };
        `.trim(),
        language: 'javascript',
        fileName: 'calculator.js',
        functions: [
          {
            name: 'calculateSum',
            parameters: [
              { name: 'a', type: 'number' },
              { name: 'b', type: 'number' }
            ],
            returnType: 'number',
            startLine: 1,
            endLine: 5,
            complexity: 2,
            isExported: true
          },
          {
            name: 'calculateProduct',
            parameters: [
              { name: 'a', type: 'number' },
              { name: 'b', type: 'number' }
            ],
            returnType: 'number',
            startLine: 7,
            endLine: 9,
            complexity: 1,
            isExported: true
          }
        ],
        metrics: {
          linesOfCode: 11,
          logicalLines: 8,
          commentLines: 0,
          blankLines: 3,
          cyclomaticComplexity: 3,
          maintainabilityIndex: 85
        },
        status: 'completed',
        analyzedAt: new Date(),
        category: 'utility',
        tags: ['math', 'calculator', 'basic-operations']
      },
      {
        userId: user.id,
        code: `
class UserService {
  constructor(database) {
    this.db = database;
  }

  async createUser(userData) {
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    const existingUser = await this.db.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    return this.db.createUser(userData);
  }

  async getUserById(id) {
    if (!id) {
      throw new Error('User ID is required');
    }
    
    return this.db.findUserById(id);
  }
}

module.exports = UserService;
        `.trim(),
        language: 'javascript',
        fileName: 'UserService.js',
        classes: [
          {
            name: 'UserService',
            methods: [
              {
                name: 'constructor',
                parameters: [{ name: 'database', type: 'object' }],
                startLine: 2,
                endLine: 4,
                complexity: 1
              },
              {
                name: 'createUser',
                parameters: [{ name: 'userData', type: 'object' }],
                returnType: 'Promise',
                startLine: 6,
                endLine: 16,
                complexity: 3,
                isAsync: true
              },
              {
                name: 'getUserById',
                parameters: [{ name: 'id', type: 'string' }],
                returnType: 'Promise',
                startLine: 18,
                endLine: 23,
                complexity: 2,
                isAsync: true
              }
            ],
            startLine: 1,
            endLine: 24,
            isExported: true
          }
        ],
        metrics: {
          linesOfCode: 26,
          logicalLines: 20,
          commentLines: 0,
          blankLines: 6,
          cyclomaticComplexity: 6,
          maintainabilityIndex: 75
        },
        status: 'completed',
        analyzedAt: new Date(),
        category: 'service',
        tags: ['user-management', 'database', 'async']
      }
    ];

    for (const analysisData of codeAnalyses) {
      try {
        if (models.isMongoDB()) {
          await models.CodeAnalysis.create(analysisData);
        } else {
          await models.CodeAnalysis.create(analysisData);
        }
        console.log(`  ✓ Created code analysis: ${analysisData.fileName}`);
      } catch (error) {
        console.error(`  ❌ Failed to create analysis for ${analysisData.fileName}:`, error.message);
      }
    }
  }

  /**
   * Seed test generations
   */
  async seedTestGenerations() {
    console.log('🧪 Seeding test generations...');
    
    // Get user and code analysis
    const user = models.isMongoDB() 
      ? await models.User.findOne({ email: 'jane.smith@example.com' })
      : await models.User.findOne({ where: { email: 'jane.smith@example.com' } });
    
    const analysis = models.isMongoDB()
      ? await models.CodeAnalysis.findOne({ fileName: 'calculator.js' })
      : await models.CodeAnalysis.findOne({ where: { fileName: 'calculator.js' } });
    
    if (!user || !analysis) {
      console.log('  ⚠️ Missing user or analysis for test generation seeding');
      return;
    }

    const testGenerations = [
      {
        userId: user.id,
        analysisId: analysis.id,
        selectedFramework: 'jest',
        language: 'javascript',
        options: {
          includeEdgeCases: true,
          mockExternal: false,
          generateFixtures: true,
          coverageTarget: 90
        },
        generatedTests: [
          {
            name: 'should add two positive numbers correctly',
            description: 'Test addition of two positive numbers',
            code: `
test('should add two positive numbers correctly', () => {
  expect(calculateSum(2, 3)).toBe(5);
});
            `.trim(),
            type: 'unit',
            framework: 'jest',
            targetFunction: 'calculateSum',
            inputs: [
              { name: 'a', value: 2, type: 'number' },
              { name: 'b', value: 3, type: 'number' }
            ],
            expectedOutput: 5,
            assertions: [
              { type: 'equals', expected: 5 }
            ],
            priority: 'high',
            estimatedCoverage: { lines: 80, branches: 50, functions: 100 }
          },
          {
            name: 'should throw error for invalid input types',
            description: 'Test error handling for non-numeric inputs',
            code: `
test('should throw error for invalid input types', () => {
  expect(() => calculateSum('a', 2)).toThrow('Both arguments must be numbers');
  expect(() => calculateSum(2, 'b')).toThrow('Both arguments must be numbers');
});
            `.trim(),
            type: 'unit',
            framework: 'jest',
            targetFunction: 'calculateSum',
            assertions: [
              { type: 'throws', expected: 'Both arguments must be numbers' }
            ],
            priority: 'high',
            tags: ['error-handling', 'edge-case'],
            estimatedCoverage: { lines: 100, branches: 100, functions: 100 }
          }
        ],
        metadata: {
          modelUsed: 'microsoft/CodeBERT-base',
          generationTime: 1250,
          confidence: 0.87,
          cost: 0.02,
          totalTokens: 456
        },
        status: 'completed',
        progress: 100,
        summary: {
          totalTests: 2,
          testsByType: { unit: 2, integration: 0, e2e: 0 },
          estimatedCoverage: { lines: 90, branches: 75, functions: 100 },
          qualityScore: 85
        },
        category: 'utility',
        tags: ['calculator', 'math-functions']
      }
    ];

    for (const testGenData of testGenerations) {
      try {
        if (models.isMongoDB()) {
          await models.TestGeneration.create(testGenData);
        } else {
          await models.TestGeneration.create(testGenData);
        }
        console.log(`  ✓ Created test generation for ${testGenData.selectedFramework}`);
      } catch (error) {
        console.error(`  ❌ Failed to create test generation:`, error.message);
      }
    }
  }

  /**
   * Seed coverage reports
   */
  async seedCoverageReports() {
    console.log('📈 Seeding coverage reports...');
    
    // Get related records
    const user = models.isMongoDB() 
      ? await models.User.findOne({ email: 'jane.smith@example.com' })
      : await models.User.findOne({ where: { email: 'jane.smith@example.com' } });
    
    const analysis = models.isMongoDB()
      ? await models.CodeAnalysis.findOne({ fileName: 'calculator.js' })
      : await models.CodeAnalysis.findOne({ where: { fileName: 'calculator.js' } });
    
    const testGeneration = models.isMongoDB()
      ? await models.TestGeneration.findOne({ userId: user?.id })
      : await models.TestGeneration.findOne({ where: { userId: user?.id } });
    
    if (!user || !analysis || !testGeneration) {
      console.log('  ⚠️ Missing required records for coverage report seeding');
      return;
    }

    const coverageReports = [
      {
        userId: user.id,
        testGenerationId: testGeneration.id,
        analysisId: analysis.id,
        sourceCode: analysis.code,
        language: 'javascript',
        testFramework: 'jest',
        coverage: {
          overall: 85.5,
          lines: 88.0,
          branches: 75.0,
          functions: 100.0,
          statements: 90.0
        },
        targetCoverage: {
          overall: 80,
          lines: 80,
          branches: 75,
          functions: 90,
          statements: 80
        },
        uncoveredLines: [
          {
            file: 'calculator.js',
            line: 15,
            code: 'console.log("Debug message");',
            reason: 'Debug statement not covered in tests',
            category: 'untested',
            severity: 'low'
          }
        ],
        missingCases: [
          {
            type: 'edge_case',
            description: 'Test with very large numbers',
            file: 'calculator.js',
            function: 'calculateSum',
            recommendation: 'Add test case with Number.MAX_SAFE_INTEGER values',
            priority: 'medium',
            effort: 'easy'
          },
          {
            type: 'error_handling',
            description: 'Test with null values',
            file: 'calculator.js',
            function: 'calculateSum',
            recommendation: 'Add test cases for null and undefined inputs',
            priority: 'high',
            effort: 'easy'
          }
        ],
        recommendations: [
          {
            type: 'add_test',
            title: 'Add boundary condition tests',
            description: 'Test behavior with extreme values like infinity and very large numbers',
            file: 'calculator.js',
            function: 'calculateSum',
            priority: 'medium',
            effort: 'easy',
            impact: 'medium',
            category: 'coverage',
            estimatedCoverageIncrease: 10,
            status: 'pending'
          }
        ],
        status: 'completed',
        analysisCompletedAt: new Date(),
        processingTime: 850,
        qualityMetrics: {
          coverageScore: 85,
          testQualityScore: 78,
          maintainabilityScore: 82,
          completenessScore: 80
        },
        tags: ['calculator', 'unit-tests', 'coverage-analysis']
      }
    ];

    for (const reportData of coverageReports) {
      try {
        if (models.isMongoDB()) {
          await models.CoverageReport.create(reportData);
        } else {
          await models.CoverageReport.create(reportData);
        }
        console.log(`  ✓ Created coverage report`);
      } catch (error) {
        console.error(`  ❌ Failed to create coverage report:`, error.message);
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll() {
    console.log('🧹 Clearing all data...');
    
    try {
      if (models.isMongoDB()) {
        await models.CoverageReport.deleteMany({});
        await models.TestGeneration.deleteMany({});
        await models.CodeAnalysis.deleteMany({});
        await models.User.deleteMany({});
      } else {
        await models.CoverageReport.destroy({ where: {}, force: true });
        await models.TestGeneration.destroy({ where: {}, force: true });
        await models.CodeAnalysis.destroy({ where: {}, force: true });
        await models.User.destroy({ where: {}, force: true });
      }
      
      console.log('✅ All data cleared successfully!');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      throw error;
    }
  }
}

module.exports = DatabaseSeeder;