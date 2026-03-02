const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Running B2B profile migration...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '../database/b2b-profile-migration.sql'),
      'utf8'
    );

    await pool.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('   - Added account_type, instagram_url, portfolio_url, verification_badge to accounts');
    console.log('   - Created creator_profiles table');
    console.log('   - Set up auto-creation trigger for creator profiles\n');

    // Show updated schema
    console.log('📊 Sample accounts with creator profiles:');
    const result = await pool.query(`
      SELECT
        a.id,
        a.name,
        a.email,
        a.account_type,
        a.is_verified,
        CASE WHEN cp.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_creator_profile
      FROM accounts a
      LEFT JOIN creator_profiles cp ON cp.account_id = a.id
      LIMIT 5
    `);

    console.table(result.rows);

  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
