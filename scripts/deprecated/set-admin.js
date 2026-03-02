const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setAdmin() {
  try {
    console.log('Connecting to database...');

    // List all accounts
    console.log('\n📋 Current accounts:');
    const accounts = await pool.query('SELECT id, email, name, is_admin FROM accounts ORDER BY created_at');
    accounts.rows.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.email} - ${acc.name} (Admin: ${acc.is_admin})`);
    });

    if (accounts.rows.length === 0) {
      console.log('❌ No accounts found. Please sign up first.');
      process.exit(1);
    }

    // Set the first account as admin
    const firstAccount = accounts.rows[0];
    console.log(`\n🔧 Setting ${firstAccount.email} as admin...`);

    await pool.query('UPDATE accounts SET is_admin = TRUE WHERE id = $1', [firstAccount.id]);

    console.log('✅ Admin access granted!');

    // Verify
    const verify = await pool.query('SELECT email, is_admin FROM accounts WHERE id = $1', [firstAccount.id]);
    console.log('\n✅ Verification:', verify.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setAdmin();
