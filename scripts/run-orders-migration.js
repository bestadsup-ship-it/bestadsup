const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runOrdersMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/orders-and-projects.sql'),
      'utf8'
    );

    console.log('Running orders and projects migration...');
    await client.query(migrationSQL);
    console.log('✓ Migration completed successfully');

    // Verify tables were created
    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('orders', 'project_messages', 'deliverables', 'order_revisions', 'order_timeline')
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);
    console.log('\n✓ Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check indexes
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('orders', 'project_messages', 'deliverables', 'order_revisions', 'order_timeline')
      ORDER BY indexname;
    `;

    const indexResult = await client.query(indexQuery);
    console.log(`\n✓ Indexes created: ${indexResult.rows.length} indexes`);

    // Check functions
    const functionQuery = `
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('generate_order_number', 'update_orders_updated_at');
    `;

    const functionResult = await client.query(functionQuery);
    console.log(`\n✓ Functions created: ${functionResult.rows.length} functions`);
    functionResult.rows.forEach(row => {
      console.log(`  - ${row.proname}()`);
    });

    console.log('\n✅ Orders and Projects migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create orders API endpoints');
    console.log('2. Build checkout flow in frontend');
    console.log('3. Create project workspace UI');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runOrdersMigration();
