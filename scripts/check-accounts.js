const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('Checking production database...\n');

  const accounts = await pool.query('SELECT id, name, email, account_type, created_at FROM accounts ORDER BY created_at DESC LIMIT 5');

  console.log(`Total accounts: ${accounts.rows.length}\n`);

  if (accounts.rows.length > 0) {
    console.log('Recent signups:');
    accounts.rows.forEach((a, i) => {
      const time = new Date(a.created_at).toLocaleString();
      console.log(`  ${i+1}. ${a.name} (${a.account_type}) - ${a.email}`);
      console.log(`     Created: ${time}\n`);
    });
  } else {
    console.log('No accounts yet. Try signing up at your Netlify URL!');
  }

  await pool.end();
}

check();
