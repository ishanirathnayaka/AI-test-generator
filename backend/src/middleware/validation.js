const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  objectId: (field) => param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
  
  language: body('language')
    .isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp'])
    .withMessage('Unsupported programming language'),
  
  framework: body('framework')
    .isIn(['jest', 'mocha', 'vitest', 'pytest', 'junit'])
    .withMessage('Unsupported testing framework'),
  
  testType: body('testType')
    .isIn(['unit', 'integration', 'e2e'])
    .withMessage('Invalid test type')
};

// Validation handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    throw new ValidationError('Validation failed', validationErrors);
  }
  
  next();
};

module.exports = {
  commonValidations,
  handleValidation
};