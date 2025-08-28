import { api } from './api';

/**
 * Code Analysis Service
 * Handles all code analysis related API calls
 */
class CodeAnalysisService {
  /**
   * Analyze code
   * @param {Object} analysisData - Code analysis request data
   * @returns {Promise} API response
   */
  async analyzeCode(analysisData) {
    try {
      const response = await api.post('/code/analyze', {
        code: analysisData.code,
        language: analysisData.language,
        framework: analysisData.framework,
        options: {
          includeComplexity: true,
          includeDependencies: true,
          includeTestCandidates: true,
          ...analysisData.options
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
   * Get analysis by ID
   * @param {string} analysisId - Analysis ID
   * @returns {Promise} API response
   */
  async getAnalysis(analysisId) {
    try {
      const response = await api.get(`/code/analysis/${analysisId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user analyses with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getUserAnalyses(params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        language: params.language,
        framework: params.framework,
        search: params.search
      };

      // Remove undefined values
      Object.keys(queryParams).forEach(key => 
        queryParams[key] === undefined && delete queryParams[key]
      );

      const response = await api.get('/code/analysis', { params: queryParams });
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
   * Delete analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Promise} API response
   */
  async deleteAnalysis(analysisId) {
    try {
      await api.delete(`/code/analysis/${analysisId}`);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user analytics
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getUserAnalytics(params = {}) {
    try {
      const response = await api.get('/code/analytics', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get supported languages and frameworks
   * @returns {Promise} API response
   */
  async getSupportedOptions() {
    try {
      const response = await api.get('/code/supported');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
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
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data
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

export default new CodeAnalysisService();