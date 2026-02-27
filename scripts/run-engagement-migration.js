const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('📋 Running engagement.sql migration...');

    const engagementSql = fs.readFileSync(
      path.resolve(__dirname, '../database/engagement.sql'),
      'utf8'
    );

    // Split into logical blocks (tables, functions, triggers, indexes)
    const blocks = [];
    let currentBlock = '';
    let inFunction = false;

    const lines = engagementSql.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and standalone comments
      if (!trimmed || trimmed.startsWith('--')) continue;

      currentBlock += line + '\n';

      // Detect function/DO block start
      if (trimmed.includes('$$') || trimmed.includes('$BODY$') || trimmed.startsWith('DO $$')) {
        inFunction = !inFunction;
      }

      // End of statement
      if (trimmed.endsWith(';') && !inFunction) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
    }

    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }

    console.log(`Found ${blocks.length} SQL blocks to execute\n`);

    // Execute each block individually
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      try {
        // Show preview of block being executed
        const preview = block.substring(0, 80).replace(/\n/g, ' ');
        console.log(`[${i + 1}/${blocks.length}] ${preview}...`);

        await pool.query(block);
      } catch (error) {
        console.error(`\n❌ Error executing block ${i + 1}:`);
        console.error('Block:', block.substring(0, 300));
        console.error('Error:', error.message);
        throw error;
      }
    }

    console.log('\n✅ engagement.sql completed');

    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('comments', 'comment_likes', 'notifications', 'follows', 'post_likes', 'post_saves')
      ORDER BY table_name;
    `);
    console.log('Tables created:', result.rows.map(r => r.table_name).join(', '));

    console.log('\n🎉 Engagement system ready!');

  } catch (error) {
    console.error('\n❌ Migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
