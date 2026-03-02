const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔗 Connecting to database...');
    console.log('📍 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database/verification-system.sql'),
      'utf8'
    );

    console.log('📄 Applying verification system migration...\n');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying new verification tables...');

    // Verify verification tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('verification_badges', 'verification_data', 'verification_requests', 'third_party_connections')
      ORDER BY table_name
    `);

    console.log('\n📋 Verification tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check if verification fields were added to accounts table
    const accountColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'accounts'
        AND column_name IN ('verification_level', 'has_verified_results', 'verification_score')
      ORDER BY column_name
    `);

    console.log('\n📋 Verification fields added to accounts:');
    accountColumnsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    client.release();
    await pool.end();

    console.log('\n🎉 Verification system migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
