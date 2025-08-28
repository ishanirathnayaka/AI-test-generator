#!/usr/bin/env node

const { program } = require('commander');
require('dotenv').config();

const { connectDatabase, closeDatabase } = require('../config/database');
const DatabaseSeeder = require('./seeder');
const models = require('../models');

// CLI Program setup
program
  .name('db-cli')
  .description('Database management CLI for AI Test Generator')
  .version('1.0.0');

// Database connection wrapper
async function withDatabase(operation) {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    await operation();
    
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    try {
      await closeDatabase();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('⚠️ Error closing database connection:', error.message);
    }
  }
}

// Seed command
program
  .command('seed')
  .description('Seed the database with sample data')
  .option('-c, --clear', 'Clear existing data before seeding')
  .option('-u, --users', 'Seed only users')
  .option('-a, --analyses', 'Seed only code analyses')
  .option('-t, --tests', 'Seed only test generations')
  .option('-r, --reports', 'Seed only coverage reports')
  .action(async (options) => {
    await withDatabase(async () => {
      const seeder = new DatabaseSeeder();
      
      if (options.clear) {
        await seeder.clearAll();
      }
      
      if (options.users) {
        await seeder.seedUsers();
      } else if (options.analyses) {
        await seeder.seedCodeAnalyses();
      } else if (options.tests) {
        await seeder.seedTestGenerations();
      } else if (options.reports) {
        await seeder.seedCoverageReports();
      } else {
        await seeder.seedAll();
      }
    });
  });

// Clear command
program
  .command('clear')
  .description('Clear all data from the database')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.yes) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to clear all data? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled');
        return;
      }
    }
    
    await withDatabase(async () => {
      const seeder = new DatabaseSeeder();
      await seeder.clearAll();
    });
  });

// Status command
program
  .command('status')
  .description('Check database connection and show statistics')
  .action(async () => {
    await withDatabase(async () => {
      const status = await models.utils.getConnectionStatus();
      console.log('\n📊 Database Status:');
      console.log(`   Type: ${status.database}`);
      console.log(`   Connected: ${status.connected ? '✅' : '❌'}`);
      
      if (status.connected) {
        console.log(`   Host: ${status.host || 'N/A'}`);
        console.log(`   Database: ${status.name || 'N/A'}`);
        
        // Get statistics
        try {
          let stats = {};
          
          if (models.isMongoDB()) {
            const [users, analyses, tests, reports] = await Promise.all([
              models.User.countDocuments(),
              models.CodeAnalysis.countDocuments(),
              models.TestGeneration.countDocuments(),
              models.CoverageReport.countDocuments()
            ]);
            
            stats = { users, analyses, tests, reports };
          } else {
            const [users, analyses, tests, reports] = await Promise.all([
              models.User.count(),
              models.CodeAnalysis.count(),
              models.TestGeneration.count(),
              models.CoverageReport.count()
            ]);
            
            stats = { users, analyses, tests, reports };
          }
          
          console.log('\n📈 Data Statistics:');
          console.log(`   Users: ${stats.users}`);
          console.log(`   Code Analyses: ${stats.analyses}`);
          console.log(`   Test Generations: ${stats.tests}`);
          console.log(`   Coverage Reports: ${stats.reports}`);
          
        } catch (error) {
          console.error('   ⚠️ Could not fetch statistics:', error.message);
        }
      } else if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    });
  });

// Migrate command (PostgreSQL only)
program
  .command('migrate')
  .description('Run database migrations (PostgreSQL only)')
  .option('-d, --down', 'Rollback migrations')
  .action(async (options) => {
    if (models.isMongoDB()) {
      console.log('❌ Migrations are only supported for PostgreSQL');
      return;
    }
    
    await withDatabase(async () => {
      if (options.down) {
        console.log('⬇️ Rolling back migrations...');
        // Implementation would depend on migration tool setup
        console.log('⚠️ Migration rollback not implemented yet');
      } else {
        console.log('⬆️ Running migrations...');
        await models.utils.syncDatabase({ alter: true });
        console.log('✅ Migrations completed');
      }
    });
  });

// Backup command
program
  .command('backup')
  .description('Create a database backup')
  .option('-f, --file <filename>', 'Backup filename', `backup-${Date.now()}.json`)
  .action(async (options) => {
    await withDatabase(async () => {
      console.log('💾 Creating backup...');
      
      const fs = require('fs');
      const path = require('path');
      
      try {
        let data = {};
        
        if (models.isMongoDB()) {
          data.users = await models.User.find({});
          data.codeAnalyses = await models.CodeAnalysis.find({});
          data.testGenerations = await models.TestGeneration.find({});
          data.coverageReports = await models.CoverageReport.find({});
        } else {
          data.users = await models.User.findAll();
          data.codeAnalyses = await models.CodeAnalysis.findAll();
          data.testGenerations = await models.TestGeneration.findAll();
          data.coverageReports = await models.CoverageReport.findAll();
        }
        
        const backupPath = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupPath)) {
          fs.mkdirSync(backupPath, { recursive: true });
        }
        
        const filePath = path.join(backupPath, options.file);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`✅ Backup created: ${filePath}`);
        console.log(`   Users: ${data.users.length}`);
        console.log(`   Code Analyses: ${data.codeAnalyses.length}`);
        console.log(`   Test Generations: ${data.testGenerations.length}`);
        console.log(`   Coverage Reports: ${data.coverageReports.length}`);
        
      } catch (error) {
        console.error('❌ Backup failed:', error.message);
        throw error;
      }
    });
  });

// Restore command
program
  .command('restore')
  .description('Restore database from backup')
  .argument('<file>', 'Backup file to restore from')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (file, options) => {
    if (!options.yes) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('⚠️  This will replace all existing data. Continue? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled');
        return;
      }
    }
    
    await withDatabase(async () => {
      const fs = require('fs');
      const path = require('path');
      
      console.log('📦 Restoring from backup...');
      
      try {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Backup file not found: ${filePath}`);
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Clear existing data
        const seeder = new DatabaseSeeder();
        await seeder.clearAll();
        
        // Restore data
        if (data.users && data.users.length > 0) {
          await models.utils.bulkCreate('User', data.users);
          console.log(`   ✓ Restored ${data.users.length} users`);
        }
        
        if (data.codeAnalyses && data.codeAnalyses.length > 0) {
          await models.utils.bulkCreate('CodeAnalysis', data.codeAnalyses);
          console.log(`   ✓ Restored ${data.codeAnalyses.length} code analyses`);
        }
        
        if (data.testGenerations && data.testGenerations.length > 0) {
          await models.utils.bulkCreate('TestGeneration', data.testGenerations);
          console.log(`   ✓ Restored ${data.testGenerations.length} test generations`);
        }
        
        if (data.coverageReports && data.coverageReports.length > 0) {
          await models.utils.bulkCreate('CoverageReport', data.coverageReports);
          console.log(`   ✓ Restored ${data.coverageReports.length} coverage reports`);
        }
        
        console.log('✅ Restore completed successfully');
        
      } catch (error) {
        console.error('❌ Restore failed:', error.message);
        throw error;
      }
    });
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}