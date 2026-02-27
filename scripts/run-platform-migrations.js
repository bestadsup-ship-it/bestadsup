#!/usr/bin/env node

/**
 * Platform Migration Runner
 * Runs all migrations to transform the platform into a B2B Creator Marketplace
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

const migrations = [
  {
    name: 'User Types Migration',
    file: 'user-types-migration.sql',
    description: 'Add Creator/Buyer account types and profile tables'
  },
  {
    name: 'Services Marketplace Migration',
    file: 'services-marketplace-migration.sql',
    description: 'Transform products into service packages with reviews and orders'
  },
  {
    name: 'Portfolio Posts Migration',
    file: 'portfolio-posts-migration.sql',
    description: 'Add portfolio and case study features to posts'
  }
];

async function runMigration(migration) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${migration.name}`);
  console.log(`Description: ${migration.description}`);
  console.log('='.repeat(60));

  const filePath = path.join(__dirname, '..', 'database', migration.file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${migration.file}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    await pool.query(sql);
    console.log(`✅ ${migration.name} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${migration.name}:`);
    console.error(error.message);

    // Show more detailed error for debugging
    if (error.position) {
      const lines = sql.split('\n');
      const position = parseInt(error.position);
      let charCount = 0;
      let errorLine = 0;

      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1; // +1 for newline
        if (charCount >= position) {
          errorLine = i + 1;
          break;
        }
      }

      console.error(`Error near line ${errorLine}:`);
      console.error(lines[errorLine - 1]);
    }

    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     BestAdsUp - B2B Creator Marketplace Migrations         ║
║          Transform into "TikTok for B2B Marketing"         ║
╚════════════════════════════════════════════════════════════╝
`);

  // Check database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    process.exit(1);
  }

  // Run migrations
  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Update frontend components to use new schema fields');
    console.log('3. Test Creator vs Buyer account flows');
    console.log('4. Configure service categories and example services\n');
  }

  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  pool.end();
  process.exit(1);
});
