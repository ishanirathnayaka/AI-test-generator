const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration
const config = {
  database: process.env.DATABASE_TYPE || 'mongodb', // 'mongodb' or 'postgresql'
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-test-generator',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    }
  },
  postgresql: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'ai_test_generator',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

let sequelize = null;

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('✅ Connected to MongoDB');
    
    // Handle MongoDB connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// PostgreSQL connection
const connectPostgreSQL = async () => {
  try {
    sequelize = new Sequelize(
      config.postgresql.database,
      config.postgresql.username,
      config.postgresql.password,
      {
        host: config.postgresql.host,
        port: config.postgresql.port,
        dialect: config.postgresql.dialect,
        logging: config.postgresql.logging,
        pool: config.postgresql.pool
      }
    );

    // Test the connection
    await sequelize.authenticate();
    logger.info('✅ Connected to PostgreSQL');

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('📊 Database models synchronized');
    }

  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
};

// Generic database connection function
const connectDatabase = async () => {
  try {
    if (config.database === 'mongodb') {
      await connectMongoDB();
    } else if (config.database === 'postgresql') {
      await connectPostgreSQL();
    } else {
      throw new Error(`Unsupported database type: ${config.database}`);
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    if (config.database === 'mongodb') {
      const state = mongoose.connection.readyState;
      return {
        status: state === 1 ? 'connected' : 'disconnected',
        type: 'mongodb',
        state: state
      };
    } else if (config.database === 'postgresql' && sequelize) {
      await sequelize.authenticate();
      return {
        status: 'connected',
        type: 'postgresql'
      };
    }
    return { status: 'unknown', type: config.database };
  } catch (error) {
    return {
      status: 'error',
      type: config.database,
      error: error.message
    };
  }
};

// Close database connections
const closeDatabase = async () => {
  try {
    if (config.database === 'mongodb') {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } else if (config.database === 'postgresql' && sequelize) {
      await sequelize.close();
      logger.info('PostgreSQL connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

module.exports = {
  config,
  connectDatabase,
  checkDatabaseHealth,
  closeDatabase,
  sequelize: () => sequelize,
  mongoose
};