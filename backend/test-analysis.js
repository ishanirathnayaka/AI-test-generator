const codeAnalysisService = require('./src/services/codeAnalysisService');

console.log('Testing Code Analysis Engine...');

// Simple test code
const testCode = `
function hello(name) {
  if (!name) {
    return 'Hello, World!';
  }
  return 'Hello, ' + name + '!';
}
`;

// Mock user ID for testing
const testUserId = 'test-user-123';

async function runTest() {
  try {
    const result = await codeAnalysisService.analyzeCode({
      code: testCode,
      language: 'javascript',
      userId: testUserId,
      fileName: 'test.js'
    });
    
    console.log('Analysis completed!');
    console.log('Functions found:', result.functions.length);
    console.log('Status:', result.status);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTest();