// Export all API services
export { default as api } from './api';
export { default as authService } from './authService';
export { default as codeAnalysisService } from './codeAnalysisService';
export { default as testGenerationService } from './testGenerationService';
export { default as coverageAnalysisService } from './coverageAnalysisService';
export { default as userService } from './userService';
export { default as errorHandlingService } from './errorHandlingService';

// Service configuration
export const serviceConfig = {
  apiTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableErrorLogging: true,
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
};

// Service utilities
export const serviceUtils = {
  /**
   * Create API request with retry logic
   * @param {Function} requestFn - API request function
   * @param {Object} options - Retry options
   * @returns {Promise} API response
   */
  withRetry: async (requestFn, options = {}) => {
    const maxAttempts = options.maxAttempts || serviceConfig.retryAttempts;
    const delay = options.delay || serviceConfig.retryDelay;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Check if error is retryable
        const isRetryable = error.response?.status >= 500 || !error.response;
        if (!isRetryable) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
  },

  /**
   * Batch multiple API calls
   * @param {Array} requests - Array of request functions
   * @param {Object} options - Batch options
   * @returns {Promise} Array of results
   */
  batchRequests: async (requests, options = {}) => {
    const concurrency = options.concurrency || 3;
    const results = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(request => request())
      );
      results.push(...batchResults);
      
      // Add delay between batches if specified
      if (options.batchDelay && i + concurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, options.batchDelay));
      }
    }
    
    return results;
  },

  /**
   * Create cancellable request
   * @param {Function} requestFn - API request function
   * @returns {Object} Request with cancel function
   */
  createCancellableRequest: (requestFn) => {
    const controller = new AbortController();
    
    const request = requestFn(controller.signal);
    const cancel = () => controller.abort();
    
    return { request, cancel };
  },

  /**
   * Monitor API performance
   * @param {string} operationName - Operation identifier
   * @param {Function} requestFn - API request function
   * @returns {Promise} API response with timing
   */
  withPerformanceMonitoring: async (operationName, requestFn) => {
    if (!serviceConfig.enablePerformanceMonitoring) {
      return await requestFn();
    }
    
    const startTime = performance.now();
    
    try {
      const result = await requestFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`API Performance: ${operationName} took ${duration.toFixed(2)}ms`);
      
      // Log slow requests
      if (duration > 2000) {
        console.warn(`Slow API request detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`API Error: ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  /**
   * Format API response for consistent handling
   * @param {Object} response - Raw API response
   * @returns {Object} Formatted response
   */
  formatResponse: (response) => {
    return {
      success: true,
      data: response.data?.data || response.data,
      message: response.data?.message,
      pagination: response.data?.pagination,
      metadata: response.data?.metadata
    };
  },

  /**
   * Format API error for consistent handling
   * @param {Error} error - API error
   * @returns {Object} Formatted error
   */
  formatError: (error) => {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
        validationErrors: error.response.data?.errors
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0,
        type: 'network'
      };
    } else {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0,
        type: 'unknown'
      };
    }
  }
};

export default {
  api,
  authService,
  codeAnalysisService,
  testGenerationService,
  coverageAnalysisService,
  userService,
  errorHandlingService,
  serviceConfig,
  serviceUtils
};