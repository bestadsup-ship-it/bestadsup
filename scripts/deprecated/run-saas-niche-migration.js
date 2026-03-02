require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running SaaS niche migration...');

    // Read the SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/saas-niche-migration.sql'),
      'utf8'
    );

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ SaaS niche migration completed successfully!');
    console.log('📦 Updated service categories for SaaS focus');
    console.log('🏷️ Added SaaS-specific tags');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
