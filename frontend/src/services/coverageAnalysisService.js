import { api } from './api';

/**
 * Coverage Analysis Service
 * Handles all coverage analysis related API calls
 */
class CoverageAnalysisService {
  /**
   * Analyze coverage
   * @param {Object} coverageData - Coverage analysis request data
   * @returns {Promise} API response
   */
  async analyzeCoverage(coverageData) {
    try {
      const response = await api.post('/code/analyze-coverage', {
        analysisId: coverageData.analysisId,
        generationId: coverageData.generationId,
        code: coverageData.code,
        tests: coverageData.tests,
        language: coverageData.language,
        framework: coverageData.framework,
        options: {
          includeTestFiles: false,
          excludePatterns: ['node_modules', 'dist', 'build'],
          coverageThresholds: {
            global: 80,
            perFile: 70
          },
          generateRecommendations: true,
          analyzeGaps: true,
          includeTrends: true,
          ...coverageData.options
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
   * Get coverage report by ID
   * @param {string} reportId - Report ID
   * @returns {Promise} API response
   */
  async getCoverageReport(reportId) {
    try {
      const response = await api.get(`/code/coverage/${reportId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user coverage reports with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getUserCoverageReports(params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        language: params.language,
        framework: params.framework,
        minCoverage: params.minCoverage,
        maxCoverage: params.maxCoverage,
        search: params.search
      };

      // Remove undefined values
      Object.keys(queryParams).forEach(key => 
        queryParams[key] === undefined && delete queryParams[key]
      );

      const response = await api.get('/code/coverage', { params: queryParams });
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
   * Delete coverage report
   * @param {string} reportId - Report ID
   * @returns {Promise} API response
   */
  async deleteCoverageReport(reportId) {
    try {
      await api.delete(`/code/coverage/${reportId}`);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export coverage report
   * @param {string} reportId - Report ID
   * @param {Object} exportOptions - Export options
   * @returns {Promise} Blob for download
   */
  async exportCoverageReport(reportId, exportOptions = {}) {
    try {
      const response = await api.get(`/code/coverage/${reportId}/export`, {
        params: {
          format: exportOptions.format || 'json',
          includeDetails: exportOptions.includeDetails || true,
          includeRecommendations: exportOptions.includeRecommendations || true,
          includeCharts: exportOptions.includeCharts || false
        },
        responseType: exportOptions.format === 'pdf' ? 'blob' : 'json'
      });
      
      return {
        success: true,
        data: response.data,
        filename: this.extractFilenameFromResponse(response) || `coverage-report-${reportId}.${exportOptions.format || 'json'}`
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get coverage trends
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  async getCoverageTrends(params = {}) {
    try {
      const queryParams = {
        period: params.period || 'week', // week, month, quarter, year
        language: params.language,
        framework: params.framework,
        groupBy: params.groupBy || 'date'
      };

      const response = await api.get('/code/coverage/trends', { params: queryParams });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Compare coverage reports
   * @param {string[]} reportIds - Array of report IDs to compare
   * @returns {Promise} API response
   */
  async compareCoverageReports(reportIds) {
    try {
      const response = await api.post('/code/coverage/compare', { reportIds });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get coverage recommendations
   * @param {string} reportId - Report ID
   * @param {Object} options - Recommendation options
   * @returns {Promise} API response
   */
  async getCoverageRecommendations(reportId, options = {}) {
    try {
      const response = await api.get(`/code/coverage/${reportId}/recommendations`, {
        params: {
          priority: options.priority || 'all', // high, medium, low, all
          category: options.category || 'all', // gaps, improvements, optimizations, all
          limit: options.limit || 20
        }
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
   * Update coverage thresholds
   * @param {string} reportId - Report ID
   * @param {Object} thresholds - New thresholds
   * @returns {Promise} API response
   */
  async updateCoverageThresholds(reportId, thresholds) {
    try {
      const response = await api.put(`/code/coverage/${reportId}/thresholds`, thresholds);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Simulate coverage improvement
   * @param {string} reportId - Report ID
   * @param {Object} improvements - Proposed improvements
   * @returns {Promise} API response
   */
  async simulateCoverageImprovement(reportId, improvements) {
    try {
      const response = await api.post(`/code/coverage/${reportId}/simulate`, improvements);
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
        message: error.response.data?.message || 'An error occurred during coverage analysis',
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

export default new CoverageAnalysisService();