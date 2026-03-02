const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    console.log('Connecting to database...');

    // Run admin.sql
    console.log('\n📋 Running admin.sql migration...');
    const adminSql = fs.readFileSync(
      path.resolve(__dirname, '../database/admin.sql'),
      'utf8'
    );
    await pool.query(adminSql);
    console.log('✅ admin.sql completed');

    // Run shop.sql
    console.log('\n📋 Running shop.sql migration...');
    const shopSql = fs.readFileSync(
      path.resolve(__dirname, '../database/shop.sql'),
      'utf8'
    );
    await pool.query(shopSql);
    console.log('✅ shop.sql completed');

    console.log('\n🎉 All migrations completed successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('products', 'cart_items', 'orders', 'order_items')
      ORDER BY table_name;
    `);
    console.log('Tables found:', result.rows.map(r => r.table_name).join(', '));

    // Check is_admin column
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'accounts'
      AND column_name = 'is_admin';
    `);
    console.log('is_admin column exists:', columnCheck.rows.length > 0 ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
