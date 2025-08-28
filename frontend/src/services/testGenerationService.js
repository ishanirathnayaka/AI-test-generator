import { api } from './api';

/**
 * Test Generation Service
 * Handles all test generation related API calls
 */
class TestGenerationService {
  /**
   * Generate tests
   * @param {Object} generationData - Test generation request data
   * @returns {Promise} API response
   */
  async generateTests(generationData) {
    try {
      const response = await api.post('/code/generate-tests', {
        analysisId: generationData.analysisId,
        code: generationData.code,
        language: generationData.language,
        framework: generationData.framework,
        aiModel: generationData.aiModel || 'CodeT5',
        options: {
          includeEdgeCases: true,
          mockExternal: true,
          generateFixtures: false,
          includePerformanceTests: false,
          includeIntegrationTests: false,
          maxTestsPerFunction: 5,
          complexityThreshold: 3,
          testNamingConvention: 'descriptive',
          assertionStyle: 'expect',
          coverageTarget: 80,
          ...generationData.options
        },
        advancedOptions: {
          includeDocstring: true,
          generateMocks: 'auto',
          testTimeout: 5000,
          parallelExecution: false,
          ...generationData.advancedOptions
        }
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get test generation by ID
   * @param {string} generationId - Generation ID
   * @returns {Promise} API response
   */
  async getTestGeneration(generationId) {
    try {
      const response = await api.get(`/code/tests/${generationId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user test generations with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getUserTestGenerations(params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        language: params.language,
        framework: params.framework,
        aiModel: params.aiModel,
        search: params.search
      };

      // Remove undefined values
      Object.keys(queryParams).forEach(key => 
        queryParams[key] === undefined && delete queryParams[key]
      );

      const response = await api.get('/code/tests', { params: queryParams });
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete test generation
   * @param {string} generationId - Generation ID
   * @returns {Promise} API response
   */
  async deleteTestGeneration(generationId) {
    try {
      await api.delete(`/code/tests/${generationId}`);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export tests
   * @param {string} generationId - Generation ID
   * @param {Object} exportOptions - Export options
   * @returns {Promise} Blob for download
   */
  async exportTests(generationId, exportOptions = {}) {
    try {
      const response = await api.get(`/code/tests/${generationId}/export`, {
        params: {
          format: exportOptions.format || 'files',
          includeFixtures: exportOptions.includeFixtures || false,
          includeMocks: exportOptions.includeMocks || true,
          zipFile: exportOptions.zipFile || true
        },
        responseType: 'blob'
      });
      
      return {
        success: true,
        data: response.data,
        filename: this.extractFilenameFromResponse(response) || `tests-${generationId}.zip`
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update test in generation
   * @param {string} generationId - Generation ID
   * @param {string} testId - Test ID
   * @param {Object} testData - Updated test data
   * @returns {Promise} API response
   */
  async updateTest(generationId, testId, testData) {
    try {
      const response = await api.put(`/code/tests/${generationId}/test/${testId}`, testData);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Regenerate specific test
   * @param {string} generationId - Generation ID
   * @param {string} testId - Test ID
   * @param {Object} options - Regeneration options
   * @returns {Promise} API response
   */
  async regenerateTest(generationId, testId, options = {}) {
    try {
      const response = await api.post(`/code/tests/${generationId}/test/${testId}/regenerate`, {
        aiModel: options.aiModel,
        includeEdgeCases: options.includeEdgeCases,
        complexity: options.complexity
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate generated tests
   * @param {string} generationId - Generation ID
   * @returns {Promise} API response
   */
  async validateTests(generationId) {
    try {
      const response = await api.post(`/code/tests/${generationId}/validate`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get AI model options
   * @returns {Promise} API response
   */
  async getAIModels() {
    try {
      const response = await api.get('/code/ai-models');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Extract filename from response headers
   * @param {Object} response - Axios response
   * @returns {string} Filename
   */
  extractFilenameFromResponse(response) {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].replace(/['"]/g, '');
      }
    }
    return null;
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error
   * @returns {Object} Formatted error
   */
  handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'An error occurred during test generation',
        status: error.response.status,
        data: error.response.data,
        validationErrors: error.response.data?.errors
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }
}

export default new TestGenerationService();