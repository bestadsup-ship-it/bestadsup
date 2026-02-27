const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adplatform:devpassword@localhost:5432/adplatform'
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'messages.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running messages migration...');
    await pool.query(sql);
    console.log('Messages migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
