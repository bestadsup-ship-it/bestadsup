#!/usr/bin/env node

/**
 * BestAdsUp - Complete Database Setup
 * Runs all migrations in correct order for marketplace platform
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

// CRITICAL: Migrations must run in this EXACT order due to foreign key dependencies
const migrations = [
  {
    name: 'Base Schema',
    file: 'schema.sql',
    description: 'Create base tables (accounts, posts, products)',
    required: true
  },
  {
    name: 'Auth Security',
    file: 'auth-security-migration.sql',
    description: 'Add security features (rate limiting, session management)',
    required: false
  },
  {
    name: 'Verification System',
    file: 'verification-system-migration.sql',
    description: 'OAuth connections, verified metrics, badges',
    required: true
  },
  {
    name: 'Escrow Payments',
    file: 'escrow-payments-migration.sql',
    description: 'Stripe Connect, milestone-based payments',
    required: true
  },
  {
    name: 'Project Management',
    file: 'project-management-migration.sql',
    description: 'Projects, milestones, deliverables',
    required: true
  },
  {
    name: 'Shop/Marketplace',
    file: 'shop.sql',
    description: 'Service packages and marketplace features',
    required: false
  },
  {
    name: 'B2B Profile Migration',
    file: 'b2b-profile-migration.sql',
    description: 'Enhanced creator and buyer profiles',
    required: false
  }
];

async function runMigration(migration) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${migration.name}`);
  console.log(`Description: ${migration.description}`);
  console.log('='.repeat(60));

  const filePath = path.join(__dirname, '..', 'database', migration.file);

  if (!fs.existsSync(filePath)) {
    if (migration.required) {
      console.error(`❌ REQUIRED migration file not found: ${migration.file}`);
      return false;
    } else {
      console.log(`⚠️  Optional migration file not found: ${migration.file} - Skipping`);
      return 'skipped';
    }
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
║     BestAdsUp - Database Setup                             ║
║     Verified Performance Marketing Marketplace             ║
╚════════════════════════════════════════════════════════════╝
`);

  // Check database connection
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');
    console.log(`📅 Server time: ${result.rows[0].now}`);
    console.log(`🌍 Database: ${new URL(process.env.DATABASE_URL).pathname.slice(1)}`);
    console.log(`🔗 Host: ${new URL(process.env.DATABASE_URL).host}\n`);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE_URL in .env file');
    console.error('2. Ensure PostgreSQL is running');
    console.error('3. Verify database exists: createdb bestadsup');
    process.exit(1);
  }

  // Run migrations
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const migration of migrations) {
    const result = await runMigration(migration);

    if (result === true) {
      successCount++;
    } else if (result === 'skipped') {
      skipCount++;
    } else {
      failCount++;

      // Stop on failed REQUIRED migrations
      if (migration.required) {
        console.error(`\n❌ CRITICAL: Required migration failed. Stopping.`);
        break;
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Skipped: ${skipCount}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    console.log('\nCommon issues:');
    console.log('- Foreign key constraint violations (check migration order)');
    console.log('- Table already exists (run on fresh database or manually drop tables)');
    console.log('- Permission errors (check PostgreSQL user permissions)');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n✅ Your BestAdsUp database is ready!');
    console.log('\nDatabase includes:');
    console.log('  • Accounts (Creators & Buyers)');
    console.log('  • Verification System (GA4, HubSpot, Stripe)');
    console.log('  • Escrow Payments (Milestone-based)');
    console.log('  • Project Management');
    console.log('  • Marketplace Features');
    console.log('\nNext steps:');
    console.log('1. Start dev servers: npm run dev');
    console.log('2. Create your first account at http://localhost:3005/signup');
    console.log('3. Connect verification accounts (GA4, Stripe)');
    console.log('4. Start building!\n');
  }

  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  pool.end();
  process.exit(1);
});
