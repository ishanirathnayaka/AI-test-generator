/**
 * Error Handling Service
 * Centralized error handling and user notification system
 */
class ErrorHandlingService {
  constructor() {
    this.errorHandlers = new Map();
    this.globalErrorHandler = null;
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
  }

  /**
   * Register error handler for specific error types
   * @param {string} errorType - Error type identifier
   * @param {Function} handler - Error handler function
   */
  registerErrorHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Set global error handler
   * @param {Function} handler - Global error handler function
   */
  setGlobalErrorHandler(handler) {
    this.globalErrorHandler = handler;
  }

  /**
   * Handle error with appropriate response
   * @param {Object} error - Error object
   * @param {Object} context - Error context information
   * @returns {Object} Error handling result
   */
  handleError(error, context = {}) {
    const errorInfo = this.parseError(error);
    const errorType = this.determineErrorType(errorInfo);
    
    // Log error for debugging
    this.logError(errorInfo, context);
    
    // Try specific error handler first
    if (this.errorHandlers.has(errorType)) {
      const handler = this.errorHandlers.get(errorType);
      const result = handler(errorInfo, context);
      if (result && result.handled) {
        return result;
      }
    }
    
    // Fall back to global error handler
    if (this.globalErrorHandler) {
      const result = this.globalErrorHandler(errorInfo, context);
      if (result && result.handled) {
        return result;
      }
    }
    
    // Default error handling
    return this.defaultErrorHandler(errorInfo, context);
  }

  /**
   * Parse error into standardized format
   * @param {*} error - Raw error
   * @returns {Object} Parsed error information
   */
  parseError(error) {
    if (error.response) {
      // HTTP response error
      return {
        type: 'http',
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data,
        code: error.response.data?.code || error.response.status,
        validationErrors: error.response.data?.errors || null,
        originalError: error
      };
    } else if (error.request) {
      // Network error
      return {
        type: 'network',
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        originalError: error
      };
    } else if (error.name === 'ValidationError') {
      // Validation error
      return {
        type: 'validation',
        message: error.message,
        fields: error.fields || {},
        code: 'VALIDATION_ERROR',
        originalError: error
      };
    } else {
      // Generic error
      return {
        type: 'generic',
        message: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        originalError: error
      };
    }
  }

  /**
   * Determine error type for handling
   * @param {Object} errorInfo - Parsed error information
   * @returns {string} Error type
   */
  determineErrorType(errorInfo) {
    if (errorInfo.type === 'http') {
      switch (errorInfo.status) {
        case 400:
          return 'bad_request';
        case 401:
          return 'unauthorized';
        case 403:
          return 'forbidden';
        case 404:
          return 'not_found';
        case 422:
          return 'validation_error';
        case 429:
          return 'rate_limit';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'server_error';
        default:
          return 'http_error';
      }
    }
    
    return errorInfo.type;
  }

  /**
   * Default error handler
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Error context
   * @returns {Object} Handling result
   */
  defaultErrorHandler(errorInfo, context) {
    const userMessage = this.getUserFriendlyMessage(errorInfo);
    const shouldRetry = this.shouldRetryError(errorInfo, context);
    
    return {
      handled: true,
      userMessage,
      shouldRetry,
      retryDelay: shouldRetry ? this.getRetryDelay(context.retryAttempt || 0) : null,
      severity: this.getErrorSeverity(errorInfo),
      action: this.getRecommendedAction(errorInfo)
    };
  }

  /**
   * Get user-friendly error message
   * @param {Object} errorInfo - Error information
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(errorInfo) {
    const messages = {
      unauthorized: 'Please log in to continue.',
      forbidden: 'You don\'t have permission to perform this action.',
      not_found: 'The requested resource was not found.',
      validation_error: 'Please check your input and try again.',
      rate_limit: 'Too many requests. Please wait a moment before trying again.',
      server_error: 'Server error. Please try again later.',
      network: 'Network connection error. Please check your internet connection.',
      timeout: 'Request timed out. Please try again.'
    };
    
    const type = this.determineErrorType(errorInfo);
    return messages[type] || errorInfo.message || 'An unexpected error occurred.';
  }

  /**
   * Determine if error should be retried
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Error context
   * @returns {boolean} Should retry
   */
  shouldRetryError(errorInfo, context) {
    const retryableTypes = ['network', 'server_error', 'timeout'];
    const retryableStatusCodes = [500, 502, 503, 504];
    
    const currentAttempts = context.retryAttempt || 0;
    if (currentAttempts >= this.maxRetryAttempts) {
      return false;
    }
    
    if (retryableTypes.includes(this.determineErrorType(errorInfo))) {
      return true;
    }
    
    if (errorInfo.type === 'http' && retryableStatusCodes.includes(errorInfo.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Get retry delay in milliseconds
   * @param {number} attemptNumber - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay(attemptNumber) {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Get error severity level
   * @param {Object} errorInfo - Error information
   * @returns {string} Severity level
   */
  getErrorSeverity(errorInfo) {
    const type = this.determineErrorType(errorInfo);
    
    const severityMap = {
      server_error: 'high',
      network: 'medium',
      unauthorized: 'medium',
      forbidden: 'medium',
      validation_error: 'low',
      not_found: 'low',
      rate_limit: 'low'
    };
    
    return severityMap[type] || 'medium';
  }

  /**
   * Get recommended action for error
   * @param {Object} errorInfo - Error information
   * @returns {string} Recommended action
   */
  getRecommendedAction(errorInfo) {
    const type = this.determineErrorType(errorInfo);
    
    const actionMap = {
      unauthorized: 'login',
      forbidden: 'contact_support',
      not_found: 'check_url',
      validation_error: 'fix_input',
      rate_limit: 'wait_retry',
      server_error: 'retry_later',
      network: 'check_connection'
    };
    
    return actionMap[type] || 'retry';
  }

  /**
   * Log error for debugging and monitoring
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Error context
   */
  logError(errorInfo, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: errorInfo,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: context.userId || 'anonymous'
    };
    
    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Logged');
      console.error('Error Info:', errorInfo);
      console.log('Context:', context);
      console.log('Full Log Entry:', logEntry);
      console.groupEnd();
    }
    
    // In production, you would send this to an error monitoring service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    // errorMonitoring.captureError(logEntry);
  }

  /**
   * Create error notification for UI
   * @param {Object} errorInfo - Error information
   * @param {Object} handlingResult - Error handling result
   * @returns {Object} Notification object
   */
  createErrorNotification(errorInfo, handlingResult) {
    return {
      id: Date.now().toString(),
      type: 'error',
      title: 'Error',
      message: handlingResult.userMessage,
      severity: handlingResult.severity,
      action: handlingResult.action,
      autoHide: handlingResult.severity === 'low',
      duration: handlingResult.severity === 'low' ? 5000 : 0,
      retryable: handlingResult.shouldRetry,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();

// Register default error handlers
errorHandlingService.registerErrorHandler('unauthorized', (errorInfo, context) => {
  // Auto-logout on 401
  if (context.dispatch) {
    context.dispatch({ type: 'auth/logout' });
  }
  
  // Redirect to login if not already there
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=true';
  }
  
  return {
    handled: true,
    userMessage: 'Your session has expired. Please log in again.',
    shouldRetry: false,
    severity: 'medium',
    action: 'login'
  };
});

errorHandlingService.registerErrorHandler('rate_limit', (errorInfo, context) => {
  return {
    handled: true,
    userMessage: 'You\'re making requests too quickly. Please wait a moment before trying again.',
    shouldRetry: true,
    retryDelay: 5000,
    severity: 'low',
    action: 'wait_retry'
  };
});

export default errorHandlingService;