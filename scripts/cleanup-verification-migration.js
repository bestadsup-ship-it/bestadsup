require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanupPartialMigration() {
  try {
    console.log('Cleaning up partial verification migration...');

    // Drop views first (they depend on tables)
    await pool.query('DROP VIEW IF EXISTS recent_verification_activity CASCADE');
    await pool.query('DROP VIEW IF EXISTS creator_verification_summary CASCADE');

    // Drop triggers
    await pool.query('DROP TRIGGER IF EXISTS update_account_verification_on_connection_change ON verification_connections CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS update_account_verification_on_data_change ON verification_data CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS auto_grant_badge_on_verification ON verification_data CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS verification_requests_updated_at ON verification_requests CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS verification_badges_updated_at ON verification_badges CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS verification_data_updated_at ON verification_data CASCADE');
    await pool.query('DROP TRIGGER IF EXISTS verification_connections_updated_at ON verification_connections CASCADE');

    // Drop functions
    await pool.query('DROP FUNCTION IF EXISTS update_account_verification_status() CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS auto_grant_verified_results_badge() CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_verification_updated_at() CASCADE');

    // Drop tables (in reverse order of dependencies)
    await pool.query('DROP TABLE IF EXISTS verification_sync_log CASCADE');
    await pool.query('DROP TABLE IF EXISTS verification_requests CASCADE');
    await pool.query('DROP TABLE IF EXISTS verification_badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS verification_data CASCADE');
    await pool.query('DROP TABLE IF EXISTS verification_connections CASCADE');

    // Drop columns added to accounts table
    await pool.query('ALTER TABLE accounts DROP COLUMN IF EXISTS has_verified_results');
    await pool.query('ALTER TABLE accounts DROP COLUMN IF EXISTS verification_level');

    console.log('✓ Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
}

cleanupPartialMigration();
