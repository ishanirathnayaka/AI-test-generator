const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class AIServiceError extends AppError {
  constructor(message = 'AI service error', details = null) {
    super(message, 503, 'AI_SERVICE_ERROR');
    this.details = details;
  }
}

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  // Default to 500 server error
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details || null;

  // Log error details
  const errorContext = {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query
  };

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.keys(error.errors).map(key => ({
      field: key,
      message: error.errors[key].message
    }));
  } else if (error.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId, etc.)
    statusCode = 400;
    code = 'INVALID_ID_FORMAT';
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry detected';
    
    const field = Object.keys(error.keyValue)[0];
    details = {
      field,
      value: error.keyValue[field],
      message: `${field} already exists`
    };
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (error.name === 'MulterError') {
    // File upload error
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    } else {
      message = 'File upload error';
    }
  } else if (error.type === 'entity.parse.failed') {
    // JSON parsing error
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON format';
  } else if (error.type === 'entity.too.large') {
    // Request too large
    statusCode = 413;
    code = 'REQUEST_TOO_LARGE';
    message = 'Request entity too large';
  }

  // Log based on severity
  if (statusCode >= 500) {
    logger.logError(error, errorContext);
  } else if (statusCode >= 400) {
    logger.warn(`Client error: ${message}`, errorContext);
  }

  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
    details = null;
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      raw: error
    })
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    message: `The requested route ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleValidationErrors,
  // Custom error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  AIServiceError
};