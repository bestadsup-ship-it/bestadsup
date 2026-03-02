const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setAllAdmin() {
  try {
    console.log('🔧 Setting all accounts as admin...');

    const result = await pool.query('UPDATE accounts SET is_admin = TRUE');
    console.log(`✅ Updated ${result.rowCount} accounts`);

    const accounts = await pool.query('SELECT email, is_admin FROM accounts ORDER BY email');
    console.log('\n📋 All accounts:');
    accounts.rows.forEach(acc => {
      console.log(`- ${acc.email} (Admin: ${acc.is_admin})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setAllAdmin();
