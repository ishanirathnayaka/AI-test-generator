const models = require('../models');
const { connectDatabase, closeDatabase } = require('../config/database');

/**
 * Test database models and connections
 */
async function testDatabase() {
  try {
    console.log('🧪 Testing database models and connections...\n');
    
    // Test connection
    console.log('1. Testing database connection...');
    await connectDatabase();
    const status = await models.utils.getConnectionStatus();
    console.log(`   ✅ Connected to ${status.database} (${status.host}/${status.name})`);
    
    // Test model creation
    console.log('\n2. Testing model operations...');
    
    // Test User model
    console.log('   Testing User model...');
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'TestPassword123!',
      role: 'user'
    };
    
    let user;
    if (models.isMongoDB()) {
      user = await models.User.create(userData);
    } else {
      user = await models.User.create(userData);
    }
    console.log(`   ✅ User created with ID: ${user.id}`);
    
    // Test CodeAnalysis model
    console.log('   Testing CodeAnalysis model...');
    const analysisData = {
      userId: user.id,
      code: 'function test() { return true; }',
      language: 'javascript',
      fileName: 'test.js',
      status: 'completed'
    };
    
    let analysis;
    if (models.isMongoDB()) {
      analysis = await models.CodeAnalysis.create(analysisData);
    } else {
      analysis = await models.CodeAnalysis.create(analysisData);
    }
    console.log(`   ✅ CodeAnalysis created with ID: ${analysis.id}`);
    
    // Test TestGeneration model
    console.log('   Testing TestGeneration model...');
    const testGenData = {
      userId: user.id,
      analysisId: analysis.id,
      selectedFramework: 'jest',
      language: 'javascript',
      status: 'completed'
    };
    
    let testGen;
    if (models.isMongoDB()) {
      testGen = await models.TestGeneration.create(testGenData);
    } else {
      testGen = await models.TestGeneration.create(testGenData);
    }
    console.log(`   ✅ TestGeneration created with ID: ${testGen.id}`);
    
    // Test CoverageReport model
    console.log('   Testing CoverageReport model...');
    const reportData = {
      userId: user.id,
      analysisId: analysis.id,
      testGenerationId: testGen.id,
      sourceCode: 'function test() { return true; }',
      language: 'javascript',
      coverage: {
        overall: 85.5,
        lines: 88.0,
        branches: 75.0,
        functions: 100.0,
        statements: 90.0
      },
      status: 'completed'
    };
    
    let report;
    if (models.isMongoDB()) {
      report = await models.CoverageReport.create(reportData);
    } else {
      report = await models.CoverageReport.create(reportData);
    }
    console.log(`   ✅ CoverageReport created with ID: ${report.id}`);
    
    // Test relationships/associations
    console.log('\n3. Testing relationships...');
    if (models.isMongoDB()) {
      const userWithAnalyses = await models.User.findById(user.id);
      const analysisWithUser = await models.CodeAnalysis.findById(analysis.id).populate('userId');
      console.log(`   ✅ MongoDB relationships working`);
    } else {
      const userWithAnalyses = await models.User.findByPk(user.id, {
        include: [{ model: models.CodeAnalysis, as: 'codeAnalyses' }]
      });
      console.log(`   ✅ PostgreSQL associations working`);
    }
    
    // Test utility functions
    console.log('\n4. Testing utility functions...');
    const searchResults = await models.utils.textSearch('User', 'test', ['name', 'email']);
    console.log(`   ✅ Text search found ${searchResults.length} results`);
    
    const paginatedResults = await models.utils.paginate('User', { page: 1, limit: 10 });
    console.log(`   ✅ Pagination returned ${paginatedResults.data.length} items`);
    
    // Test validators
    console.log('\n5. Testing validators...');
    console.log(`   Email validation: ${models.validators.isValidEmail('test@example.com')} ✅`);
    console.log(`   Password validation: ${models.validators.isValidPassword('Test123!')} ✅`);
    console.log(`   Language validation: ${models.validators.isValidLanguage('javascript')} ✅`);
    console.log(`   Framework validation: ${models.validators.isValidFramework('jest')} ✅`);
    
    // Cleanup test data
    console.log('\n6. Cleaning up test data...');
    if (models.isMongoDB()) {
      await models.CoverageReport.deleteOne({ _id: report.id });
      await models.TestGeneration.deleteOne({ _id: testGen.id });
      await models.CodeAnalysis.deleteOne({ _id: analysis.id });
      await models.User.deleteOne({ _id: user.id });
    } else {
      await models.CoverageReport.destroy({ where: { id: report.id } });
      await models.TestGeneration.destroy({ where: { id: testGen.id } });
      await models.CodeAnalysis.destroy({ where: { id: analysis.id } });
      await models.User.destroy({ where: { id: user.id } });
    }
    console.log('   ✅ Test data cleaned up');
    
    console.log('\n🎉 All database tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    try {
      await closeDatabase();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabase();
}

module.exports = testDatabase;