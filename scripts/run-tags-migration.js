const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('📋 Running tags.sql migration...');

    const tagsSql = fs.readFileSync(
      path.resolve(__dirname, '../database/tags.sql'),
      'utf8'
    );

    await pool.query(tagsSql);
    console.log('✅ tags.sql completed');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('tags', 'post_tags', 'product_tags', 'user_tag_interests')
      ORDER BY table_name;
    `);
    console.log('Tables created:', result.rows.map(r => r.table_name).join(', '));

    // Check seed data
    const tagCount = await pool.query('SELECT COUNT(*) FROM tags');
    console.log(`Tags seeded: ${tagCount.rows[0].count}`);

    console.log('\n🎉 Tags system ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
