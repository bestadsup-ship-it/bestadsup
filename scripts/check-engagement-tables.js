const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTables() {
  try {
    console.log('🔍 Checking engagement tables...\n');

    const tables = ['comments', 'comment_likes', 'notifications', 'follows', 'post_likes', 'post_saves'];

    for (const tableName of tables) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);

      console.log(`\n📋 ${tableName}: ${tableExists.rows[0].exists ? '✅ EXISTS' : '❌ DOES NOT EXIST'}`);

      if (tableExists.rows[0].exists) {
        const columns = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        console.log('   Columns:', columns.rows.map(c => c.column_name).join(', '));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
