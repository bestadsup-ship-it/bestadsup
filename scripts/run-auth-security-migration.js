const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running auth security migration...');

    const sqlPath = path.join(__dirname, '..', 'database', 'auth-security-migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully');
    console.log('Added security fields:');
    console.log('  - failed_login_attempts');
    console.log('  - last_failed_login');
    console.log('  - locked_until');
    console.log('  - last_login');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
