const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runReviewsMigration() {
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
      path.join(__dirname, '../database/06-reviews.sql'),
      'utf8'
    );

    console.log('Running reviews migration...');
    await client.query(migrationSQL);
    console.log('✓ Migration completed successfully');

    // Verify table was created
    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'reviews';
    `;

    const result = await client.query(verifyQuery);
    if (result.rows.length > 0) {
      console.log('\n✓ Table created: reviews');
    }

    // Check indexes
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'reviews'
      ORDER BY indexname;
    `;

    const indexResult = await client.query(indexQuery);
    console.log(`\n✓ Indexes created: ${indexResult.rows.length} indexes`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    // Check functions
    const functionQuery = `
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('update_review_timestamp', 'get_service_rating_stats', 'get_creator_rating_stats');
    `;

    const functionResult = await client.query(functionQuery);
    console.log(`\n✓ Functions created: ${functionResult.rows.length} functions`);
    functionResult.rows.forEach(row => {
      console.log(`  - ${row.proname}()`);
    });

    console.log('\n✅ Reviews migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create reviews API endpoints');
    console.log('2. Add review submission to OrderDetail page');
    console.log('3. Display reviews on ServiceDetail page');
    console.log('4. Add aggregate ratings to creator profiles');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runReviewsMigration();
