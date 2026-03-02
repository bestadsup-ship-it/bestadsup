require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function auditSchema() {
  try {
    console.log('=== VERIFICATION SYSTEM SCHEMA AUDIT ===\n');

    // Check verification_data columns
    const dataColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_data'
      ORDER BY ordinal_position
    `);

    console.log('✓ verification_data columns:');
    dataColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');

    // Check verification_badges columns
    const badgeColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_badges'
      ORDER BY ordinal_position
    `);

    console.log('✓ verification_badges columns:');
    badgeColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');

    // Check verification_requests columns
    const requestColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_requests'
      ORDER BY ordinal_position
    `);

    console.log('✓ verification_requests columns:');
    requestColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');

    // Check third_party_connections columns
    const connColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'third_party_connections'
      ORDER BY ordinal_position
    `);

    console.log('✓ third_party_connections columns:');
    connColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Audit error:', error);
    process.exit(1);
  }
}

auditSchema();
