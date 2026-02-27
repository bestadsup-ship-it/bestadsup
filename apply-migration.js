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
      path.join(__dirname, 'database-migration.sql'),
      'utf8'
    );

    console.log('📄 Applying migration script...\n');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying new tables...');

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    client.release();
    await pool.end();

    console.log('\n🎉 Database migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
