const { HfInference } = require('@huggingface/inference');
const axios = require('axios');

/**
 * Hugging Face AI Integration Service
 * Handles communication with Hugging Face models for code analysis and test generation
 */
class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.inference = new HfInference(this.apiKey);
    
    // Model configurations
    this.models = {
      codeT5: {
        name: 'Salesforce/codet5-base',
        type: 'text2text-generation',
        description: 'Code-to-code generation model for test generation'
      },
      codeBERT: {
        name: 'microsoft/codebert-base',
        type: 'feature-extraction',
        description: 'Code understanding model for analysis'
      },
      codeT5Large: {
        name: 'Salesforce/codet5-large',
        type: 'text2text-generation',
        description: 'Larger code generation model for complex tests'
      },
      codeGen: {
        name: 'Salesforce/codegen-350M-mono',
        type: 'text-generation',
        description: 'Code generation model'
      }
    };

    // Rate limiting
    this.rateLimiter = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 100,
      lastReset: Date.now()
    };
  }

  /**
   * Initialize the service and validate API key
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }

    try {
      // Test API connectivity
      await this.testConnection();
      console.log('✅ Hugging Face service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Hugging Face service:', error.message);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.inference.textGeneration({
        model: 'gpt2',
        inputs: 'test',
        parameters: {
          max_length: 10,
          num_return_sequences: 1
        }
      });
      return response;
    } catch (error) {
      throw new Error(`API connection test failed: ${error.message}`);
    }
  }

  /**
   * Generate test cases for a given function
   * @param {Object} options - Generation options
   * @param {string} options.functionCode - The function code to generate tests for
   * @param {string} options.language - Programming language
   * @param {string} options.testFramework - Test framework (jest, mocha, pytest, etc.)
   * @param {Object} options.functionInfo - Extracted function information
   * @param {Object} options.generationOptions - AI generation parameters
   * @returns {Promise<Array>} Generated test cases
   */
  async generateTestCases(options) {
    const {
      functionCode,
      language,
      testFramework = 'jest',
      functionInfo,
      generationOptions = {}
    } = options;

    try {
      // Check rate limiting
      this.checkRateLimit();

      // Select appropriate model
      const model = this.selectModel(language, 'test-generation');
      
      // Create prompt for test generation
      const prompt = this.createTestGenerationPrompt({
        functionCode,
        language,
        testFramework,
        functionInfo
      });

      // Generate tests using the model
      const response = await this.callModel(model, prompt, {
        maxTokens: generationOptions.maxTokens || 2048,
        temperature: generationOptions.temperature || 0.7,
        topP: generationOptions.topP || 0.9,
        numReturnSequences: generationOptions.numTests || 3
      });

      // Parse and format the generated tests
      const testCases = this.parseGeneratedTests(response, language, testFramework);

      // Post-process and validate test cases
      const validatedTests = this.validateTestCases(testCases, functionInfo);

      return validatedTests;

    } catch (error) {
      console.error('Test generation failed:', error);
      throw new Error(`Failed to generate test cases: ${error.message}`);
    }
  }

  /**
   * Generate code documentation
   */
  async generateDocumentation(functionCode, language, functionInfo) {
    try {
      this.checkRateLimit();

      const model = this.selectModel(language, 'documentation');
      const prompt = this.createDocumentationPrompt(functionCode, language, functionInfo);

      const response = await this.callModel(model, prompt, {
        maxTokens: 1024,
        temperature: 0.3
      });

      return this.parseGeneratedDocumentation(response, language);

    } catch (error) {
      console.error('Documentation generation failed:', error);
      throw new Error(`Failed to generate documentation: ${error.message}`);
    }
  }

  /**
   * Analyze code quality and suggest improvements
   */
  async analyzeCodeQuality(functionCode, language, analysisResult) {
    try {
      this.checkRateLimit();

      const model = this.selectModel(language, 'analysis');
      const prompt = this.createQualityAnalysisPrompt(functionCode, language, analysisResult);

      const response = await this.callModel(model, prompt, {
        maxTokens: 1024,
        temperature: 0.5
      });

      return this.parseQualityAnalysis(response);

    } catch (error) {
      console.error('Code quality analysis failed:', error);
      throw new Error(`Failed to analyze code quality: ${error.message}`);
    }
  }

  /**
   * Select appropriate model for the task
   */
  selectModel(language, task) {
    // Model selection logic based on language and task
    const modelPreferences = {
      'test-generation': {
        javascript: this.models.codeT5,
        typescript: this.models.codeT5,
        python: this.models.codeT5Large,
        java: this.models.codeT5,
        default: this.models.codeT5
      },
      'documentation': {
        default: this.models.codeT5
      },
      'analysis': {
        default: this.models.codeBERT
      }
    };

    const taskModels = modelPreferences[task] || modelPreferences['test-generation'];
    return taskModels[language] || taskModels.default;
  }

  /**
   * Create prompt for test generation
   */
  createTestGenerationPrompt(options) {
    const { functionCode, language, testFramework, functionInfo } = options;
    
    const frameworkTemplates = {
      jest: {
        imports: "const { functionName } = require('./module');",
        testStructure: "describe('functionName', () => { it('should...', () => { expect(...).toBe(...); }); });"
      },
      mocha: {
        imports: "const { functionName } = require('./module'); const { expect } = require('chai');",
        testStructure: "describe('functionName', function() { it('should...', function() { expect(...).to.equal(...); }); });"
      },
      pytest: {
        imports: "import pytest\nfrom module import function_name",
        testStructure: "def test_function_name():\n    assert function_name(...) == expected"
      },
      junit: {
        imports: "import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;",
        testStructure: "@Test\npublic void testFunctionName() { assertEquals(expected, functionName(...)); }"
      }
    };

    const template = frameworkTemplates[testFramework] || frameworkTemplates.jest;
    
    let prompt = `Generate comprehensive test cases for the following ${language} function using ${testFramework}:\n\n`;
    prompt += `Function to test:\n\`\`\`${language}\n${functionCode}\n\`\`\`\n\n`;
    
    if (functionInfo) {
      prompt += `Function details:\n`;
      prompt += `- Name: ${functionInfo.name}\n`;
      prompt += `- Parameters: ${functionInfo.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}\n`;
      prompt += `- Return type: ${functionInfo.returnType}\n`;
      prompt += `- Complexity: ${functionInfo.complexity}\n\n`;
    }

    prompt += `Please generate test cases that cover:\n`;
    prompt += `1. Happy path scenarios\n`;
    prompt += `2. Edge cases and boundary conditions\n`;
    prompt += `3. Error handling and invalid inputs\n`;
    prompt += `4. Performance considerations (if applicable)\n\n`;
    
    prompt += `Use this test structure:\n${template.testStructure}\n\n`;
    prompt += `Include necessary imports:\n${template.imports}\n\n`;
    prompt += `Generate at least 3 different test cases with descriptive test names.\n`;

    return prompt;
  }

  /**
   * Create prompt for documentation generation
   */
  createDocumentationPrompt(functionCode, language, functionInfo) {
    let prompt = `Generate comprehensive documentation for the following ${language} function:\n\n`;
    prompt += `\`\`\`${language}\n${functionCode}\n\`\`\`\n\n`;
    
    prompt += `Please provide:\n`;
    prompt += `1. Function description and purpose\n`;
    prompt += `2. Parameter descriptions with types\n`;
    prompt += `3. Return value description\n`;
    prompt += `4. Usage examples\n`;
    prompt += `5. Potential side effects or considerations\n\n`;
    
    if (language === 'javascript' || language === 'typescript') {
      prompt += `Use JSDoc format.\n`;
    } else if (language === 'python') {
      prompt += `Use Python docstring format.\n`;
    } else if (language === 'java') {
      prompt += `Use JavaDoc format.\n`;
    }

    return prompt;
  }

  /**
   * Create prompt for code quality analysis
   */
  createQualityAnalysisPrompt(functionCode, language, analysisResult) {
    let prompt = `Analyze the code quality of the following ${language} function:\n\n`;
    prompt += `\`\`\`${language}\n${functionCode}\n\`\`\`\n\n`;
    
    if (analysisResult && analysisResult.metrics) {
      prompt += `Current metrics:\n`;
      prompt += `- Cyclomatic complexity: ${analysisResult.metrics.cyclomaticComplexity}\n`;
      prompt += `- Lines of code: ${analysisResult.metrics.linesOfCode}\n`;
      prompt += `- Maintainability index: ${analysisResult.metrics.maintainabilityIndex}\n\n`;
    }

    prompt += `Please provide:\n`;
    prompt += `1. Code quality assessment\n`;
    prompt += `2. Specific improvement suggestions\n`;
    prompt += `3. Best practices recommendations\n`;
    prompt += `4. Performance optimization opportunities\n`;
    prompt += `5. Security considerations (if applicable)\n`;

    return prompt;
  }

  /**
   * Call Hugging Face model with prompt
   */
  async callModel(model, prompt, options = {}) {
    this.incrementRateLimit();

    try {
      if (model.type === 'text2text-generation') {
        return await this.inference.textGeneration({
          model: model.name,
          inputs: prompt,
          parameters: {
            max_length: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            num_return_sequences: options.numReturnSequences || 1,
            do_sample: true,
            pad_token_id: 50256
          }
        });
      } else if (model.type === 'text-generation') {
        return await this.inference.textGeneration({
          model: model.name,
          inputs: prompt,
          parameters: {
            max_length: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            num_return_sequences: options.numReturnSequences || 1
          }
        });
      } else if (model.type === 'feature-extraction') {
        return await this.inference.featureExtraction({
          model: model.name,
          inputs: prompt
        });
      }

      throw new Error(`Unsupported model type: ${model.type}`);

    } catch (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Parse generated test cases from model response
   */
  parseGeneratedTests(response, language, testFramework) {
    try {
      let generatedText = '';
      
      if (Array.isArray(response)) {
        generatedText = response.map(r => r.generated_text || r.text || '').join('\n\n');
      } else {
        generatedText = response.generated_text || response.text || response;
      }

      // Extract test cases from the generated text
      const testCases = this.extractTestCases(generatedText, language, testFramework);
      
      return testCases.map((testCase, index) => ({
        id: `test_${index + 1}`,
        name: this.extractTestName(testCase),
        code: testCase.trim(),
        description: this.extractTestDescription(testCase),
        type: this.determineTestType(testCase),
        framework: testFramework,
        language: language
      }));

    } catch (error) {
      console.error('Failed to parse generated tests:', error);
      return [];
    }
  }

  /**
   * Extract individual test cases from generated text
   */
  extractTestCases(text, language, testFramework) {
    const testCases = [];
    
    if (testFramework === 'jest' || testFramework === 'mocha') {
      // Extract it() blocks
      const itMatches = text.match(/it\(['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*{[\s\S]*?}\s*\)/g);
      if (itMatches) {
        testCases.push(...itMatches);
      }
      
      // Extract test() blocks (Jest)
      const testMatches = text.match(/test\(['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*{[\s\S]*?}\s*\)/g);
      if (testMatches) {
        testCases.push(...testMatches);
      }
    } else if (testFramework === 'pytest') {
      // Extract Python test functions
      const pytestMatches = text.match(/def\s+test_\w+\([^)]*\):\s*[\s\S]*?(?=\ndef\s|\n\n|\nclass\s|$)/g);
      if (pytestMatches) {
        testCases.push(...pytestMatches);
      }
    } else if (testFramework === 'junit') {
      // Extract Java test methods
      const junitMatches = text.match(/@Test[\s\S]*?public\s+void\s+\w+\([^)]*\)\s*{[\s\S]*?^\s*}/gm);
      if (junitMatches) {
        testCases.push(...junitMatches);
      }
    }

    return testCases.length > 0 ? testCases : [text]; // Fallback to full text if no specific patterns found
  }

  /**
   * Extract test name from test case code
   */
  extractTestName(testCase) {
    // Try to extract test name from different patterns
    const patterns = [
      /it\(['"`]([^'"`]+)['"`]/,
      /test\(['"`]([^'"`]+)['"`]/,
      /def\s+(test_\w+)/,
      /public\s+void\s+(\w+)/
    ];

    for (const pattern of patterns) {
      const match = testCase.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'Generated Test';
  }

  /**
   * Extract test description from test case
   */
  extractTestDescription(testCase) {
    // Look for comments or docstrings
    const commentMatches = testCase.match(/\/\/\s*(.+)|\/\*\s*(.+?)\s*\*/);
    if (commentMatches) {
      return commentMatches[1] || commentMatches[2];
    }

    const docstringMatch = testCase.match(/['"`]{3}(.+?)['"`]{3}/s);
    if (docstringMatch) {
      return docstringMatch[1].trim();
    }

    return 'Auto-generated test case';
  }

  /**
   * Determine test type based on content
   */
  determineTestType(testCase) {
    const lowerCase = testCase.toLowerCase();
    
    if (lowerCase.includes('throw') || lowerCase.includes('error') || lowerCase.includes('exception')) {
      return 'error-handling';
    } else if (lowerCase.includes('edge') || lowerCase.includes('boundary')) {
      return 'edge-case';
    } else if (lowerCase.includes('performance') || lowerCase.includes('speed')) {
      return 'performance';
    } else if (lowerCase.includes('integration') || lowerCase.includes('end-to-end')) {
      return 'integration';
    } else {
      return 'unit';
    }
  }

  /**
   * Parse generated documentation
   */
  parseGeneratedDocumentation(response, language) {
    let documentation = response.generated_text || response.text || response;
    
    return {
      content: documentation.trim(),
      format: this.detectDocumentationFormat(documentation, language),
      sections: this.extractDocumentationSections(documentation)
    };
  }

  /**
   * Detect documentation format
   */
  detectDocumentationFormat(doc, language) {
    if (doc.includes('/**') || doc.includes('@param')) {
      return 'jsdoc';
    } else if (doc.includes('"""') || doc.includes("'''")) {
      return 'docstring';
    } else if (doc.includes('///') || doc.includes('<summary>')) {
      return 'xmldoc';
    } else {
      return 'plain';
    }
  }

  /**
   * Extract documentation sections
   */
  extractDocumentationSections(doc) {
    const sections = {};
    
    // Extract description
    const descMatch = doc.match(/(?:Description|Purpose):\s*(.+?)(?:\n\n|\n[A-Z])/s);
    if (descMatch) {
      sections.description = descMatch[1].trim();
    }
    
    // Extract parameters
    const paramMatches = doc.match(/@param\s+{\w+}\s+(\w+)\s+(.+)/g);
    if (paramMatches) {
      sections.parameters = paramMatches.map(match => {
        const parts = match.match(/@param\s+{\w+}\s+(\w+)\s+(.+)/);
        return { name: parts[1], description: parts[2] };
      });
    }
    
    return sections;
  }

  /**
   * Parse quality analysis
   */
  parseQualityAnalysis(response) {
    const analysis = response.generated_text || response.text || response;
    
    return {
      content: analysis.trim(),
      suggestions: this.extractSuggestions(analysis),
      score: this.calculateQualityScore(analysis)
    };
  }

  /**
   * Extract improvement suggestions
   */
  extractSuggestions(analysis) {
    const suggestions = [];
    
    // Look for numbered lists or bullet points
    const listMatches = analysis.match(/(?:\d+\.|[-*])\s*(.+)/g);
    if (listMatches) {
      suggestions.push(...listMatches.map(match => 
        match.replace(/^(?:\d+\.|[-*])\s*/, '').trim()
      ));
    }
    
    return suggestions;
  }

  /**
   * Calculate quality score (simplified)
   */
  calculateQualityScore(analysis) {
    const lowerCase = analysis.toLowerCase();
    let score = 70; // Base score
    
    if (lowerCase.includes('excellent') || lowerCase.includes('very good')) {
      score = 90;
    } else if (lowerCase.includes('good')) {
      score = 80;
    } else if (lowerCase.includes('poor') || lowerCase.includes('bad')) {
      score = 40;
    } else if (lowerCase.includes('needs improvement')) {
      score = 50;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Validate generated test cases
   */
  validateTestCases(testCases, functionInfo) {
    return testCases.filter(testCase => {
      // Basic validation
      if (!testCase.code || testCase.code.trim().length < 10) {
        return false;
      }
      
      // Check if test contains function name
      if (functionInfo && functionInfo.name) {
        const containsFunction = testCase.code.includes(functionInfo.name) ||
                               testCase.name.toLowerCase().includes(functionInfo.name.toLowerCase());
        if (!containsFunction) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Rate limiting functionality
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.rateLimiter.lastReset > this.rateLimiter.window) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.lastReset = now;
    }
    
    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
  }

  /**
   * Increment rate limit counter
   */
  incrementRateLimit() {
    this.rateLimiter.requests++;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: !!this.apiKey,
      models: Object.keys(this.models),
      rateLimiter: {
        requests: this.rateLimiter.requests,
        maxRequests: this.rateLimiter.maxRequests,
        remaining: this.rateLimiter.maxRequests - this.rateLimiter.requests
      }
    };
  }
}

module.exports = new HuggingFaceService();