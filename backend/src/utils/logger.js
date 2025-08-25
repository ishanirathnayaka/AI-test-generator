const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which files to write to for each log level
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Ensure logs directory exists
  const fs = require('fs');
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  exitOnError: false,
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add custom methods for specific use cases
logger.logError = (error, context = {}) => {
  logger.error(`${error.message}`, {
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

logger.logAPICall = (method, url, statusCode, responseTime, userId = null) => {
  logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
    method,
    url,
    statusCode,
    responseTime,
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.logAIOperation = (operation, model, inputSize, outputSize, processingTime, success = true) => {
  logger.info(`AI Operation: ${operation}`, {
    operation,
    model,
    inputSize,
    outputSize,
    processingTime,
    success,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurityEvent = (event, userId, ip, userAgent) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    userId,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;