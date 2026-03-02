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
      path.join(__dirname, 'database/service-enhancements-simple.sql'),
      'utf8'
    );

    console.log('📄 Applying service enhancements migration...\n');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying new service tables...');

    // Verify service tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('service_categories', 'service_reviews', 'service_views')
      ORDER BY table_name
    `);

    console.log('\n📋 Service tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check if service fields were added to products table
    const productColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('service_type', 'tagline', 'what_you_get', 'ideal_for', 'portfolio_items', 'faqs', 'tags', 'pricing_tiers')
      ORDER BY column_name
    `);

    console.log('\n📋 Service fields added to products:');
    productColumnsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    // Count categories inserted
    const categoriesResult = await client.query('SELECT COUNT(*) as count FROM service_categories');
    console.log(`\n📋 Service categories inserted: ${categoriesResult.rows[0].count}`);

    client.release();
    await pool.end();

    console.log('\n🎉 Service listings enhancement migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
