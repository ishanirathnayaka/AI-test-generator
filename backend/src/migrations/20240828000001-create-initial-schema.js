'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('user', 'admin', 'premium'),
        defaultValue: 'user'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      emailVerificationToken: {
        type: Sequelize.STRING
      },
      passwordResetToken: {
        type: Sequelize.STRING
      },
      passwordResetExpires: {
        type: Sequelize.DATE
      },
      lastLogin: {
        type: Sequelize.DATE
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lockUntil: {
        type: Sequelize.DATE
      },
      aiUsage: {
        type: Sequelize.JSONB,
        defaultValue: {
          daily: 0,
          monthly: 0,
          total: 0,
          lastReset: new Date()
        }
      },
      preferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          theme: 'light',
          defaultLanguage: 'javascript',
          defaultFramework: 'jest',
          notifications: {
            email: true,
            browser: true
          }
        }
      },
      subscription: {
        type: Sequelize.JSONB,
        defaultValue: {
          plan: 'free',
          expiresAt: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null
        }
      },
      analytics: {
        type: Sequelize.JSONB,
        defaultValue: {
          totalCodeAnalyses: 0,
          totalTestsGenerated: 0,
          totalCoverageReports: 0,
          averageCodeComplexity: 0
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for users table
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['isActive']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['createdAt']);

    // Create CodeAnalyses table
    await queryInterface.createTable('code_analyses', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      language: {
        type: Sequelize.ENUM(
          'javascript', 'typescript', 'python', 'java', 
          'cpp', 'csharp', 'php', 'ruby', 'go', 'rust'
        ),
        allowNull: false
      },
      fileName: {
        type: Sequelize.STRING
      },
      fileSize: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      ast: {
        type: Sequelize.JSONB
      },
      functions: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      classes: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      imports: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      exports: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      syntaxErrors: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      warnings: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      metrics: {
        type: Sequelize.JSONB,
        defaultValue: {
          linesOfCode: 0,
          logicalLines: 0,
          commentLines: 0,
          blankLines: 0,
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          maintainabilityIndex: 100
        }
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      analyzedAt: {
        type: Sequelize.DATE
      },
      processingTime: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      codeHash: {
        type: Sequelize.STRING
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      analysisOptions: {
        type: Sequelize.JSONB,
        defaultValue: {
          includeAST: false,
          includeMetrics: true,
          includeDependencies: true,
          complexityThreshold: 10
        }
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      category: {
        type: Sequelize.ENUM('utility', 'component', 'service', 'model', 'test', 'config', 'other'),
        defaultValue: 'other'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sharedWith: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for code_analyses table
    await queryInterface.addIndex('code_analyses', ['userId', 'createdAt']);
    await queryInterface.addIndex('code_analyses', ['language', 'status']);
    await queryInterface.addIndex('code_analyses', ['codeHash']);
    await queryInterface.addIndex('code_analyses', ['status', 'createdAt']);

    // Create TestGenerations table
    await queryInterface.createTable('test_generations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      analysisId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'code_analyses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      selectedFramework: {
        type: Sequelize.ENUM('jest', 'mocha', 'vitest', 'pytest', 'junit', 'rspec', 'go-test'),
        allowNull: false
      },
      language: {
        type: Sequelize.ENUM(
          'javascript', 'typescript', 'python', 'java', 
          'cpp', 'csharp', 'php', 'ruby', 'go', 'rust'
        ),
        allowNull: false
      },
      options: {
        type: Sequelize.JSONB,
        defaultValue: {
          includeEdgeCases: true,
          mockExternal: true,
          generateFixtures: false,
          coverageTarget: 80
        }
      },
      generatedTests: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {
          modelUsed: '',
          generationTime: 0,
          confidence: 0,
          cost: 0
        }
      },
      status: {
        type: Sequelize.ENUM('pending', 'generating', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending'
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      currentStep: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
      totalSteps: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      summary: {
        type: Sequelize.JSONB,
        defaultValue: {
          totalTests: 0,
          testsByType: { unit: 0, integration: 0, e2e: 0 },
          estimatedCoverage: { lines: 0, branches: 0, functions: 0 },
          qualityScore: 0
        }
      },
      exports: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sharedWith: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      category: {
        type: Sequelize.ENUM('api', 'component', 'utility', 'service', 'model', 'integration', 'e2e'),
        defaultValue: 'utility'
      },
      lastExecutedAt: {
        type: Sequelize.DATE
      },
      executionHistory: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for test_generations table
    await queryInterface.addIndex('test_generations', ['userId', 'createdAt']);
    await queryInterface.addIndex('test_generations', ['analysisId']);
    await queryInterface.addIndex('test_generations', ['status', 'createdAt']);
    await queryInterface.addIndex('test_generations', ['selectedFramework', 'language']);

    // Create CoverageReports table
    await queryInterface.createTable('coverage_reports', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      testGenerationId: {
        type: Sequelize.UUID,
        references: {
          model: 'test_generations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      analysisId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'code_analyses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sourceCode: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      language: {
        type: Sequelize.ENUM(
          'javascript', 'typescript', 'python', 'java', 
          'cpp', 'csharp', 'php', 'ruby', 'go', 'rust'
        ),
        allowNull: false
      },
      testCode: {
        type: Sequelize.TEXT
      },
      testFramework: {
        type: Sequelize.ENUM('jest', 'mocha', 'vitest', 'pytest', 'junit', 'rspec', 'go-test')
      },
      coverage: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          overall: 0,
          lines: 0,
          branches: 0,
          functions: 0,
          statements: 0
        }
      },
      targetCoverage: {
        type: Sequelize.JSONB,
        defaultValue: {
          overall: 80,
          lines: 80,
          branches: 75,
          functions: 90,
          statements: 80
        }
      },
      fileCoverage: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      uncoveredLines: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      missingCases: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      recommendations: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      status: {
        type: Sequelize.ENUM('pending', 'analyzing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      analysisStartedAt: {
        type: Sequelize.DATE
      },
      analysisCompletedAt: {
        type: Sequelize.DATE
      },
      processingTime: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      analysisOptions: {
        type: Sequelize.JSONB,
        defaultValue: {
          includeFileDetails: true,
          generateRecommendations: true,
          coverageThreshold: 80
        }
      },
      qualityMetrics: {
        type: Sequelize.JSONB,
        defaultValue: {
          coverageScore: 0,
          testQualityScore: 0,
          maintainabilityScore: 0,
          completenessScore: 0
        }
      },
      previousReportId: {
        type: Sequelize.UUID,
        references: {
          model: 'coverage_reports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      coverageChange: {
        type: Sequelize.JSONB,
        defaultValue: {
          overall: 0,
          lines: 0,
          branches: 0,
          functions: 0
        }
      },
      exports: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sharedWith: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      notes: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for coverage_reports table
    await queryInterface.addIndex('coverage_reports', ['userId', 'createdAt']);
    await queryInterface.addIndex('coverage_reports', ['analysisId']);
    await queryInterface.addIndex('coverage_reports', ['testGenerationId']);
    await queryInterface.addIndex('coverage_reports', ['status', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (to handle foreign key constraints)
    await queryInterface.dropTable('coverage_reports');
    await queryInterface.dropTable('test_generations');
    await queryInterface.dropTable('code_analyses');
    await queryInterface.dropTable('users');
    
    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_code_analyses_language";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_code_analyses_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_code_analyses_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_test_generations_selectedFramework";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_test_generations_language";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_test_generations_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_test_generations_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coverage_reports_language";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coverage_reports_testFramework";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coverage_reports_status";');
  }
};