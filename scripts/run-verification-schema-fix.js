require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runFix() {
  try {
    console.log('Starting verification schema fix...');

    const sqlPath = path.join(__dirname, '..', 'database', 'fix-verification-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const result = await pool.query(sql);

    console.log('✓ Verification schema fix completed successfully!');
    console.log('  - Added metric_unit column to verification_data');
    console.log('  - Added time_period column to verification_data');
    console.log('  - Renamed/added badge_level column to verification_badges');
    console.log('  - Added request_data column to verification_requests');
    console.log('  - Added reviewer_notes column to verification_requests');
    console.log('  - Created indexes for new columns');

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

runFix();
