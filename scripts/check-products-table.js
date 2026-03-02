const { Client } = require('pg');
require('dotenv').config();

async function checkProductsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);

    console.log('Products table columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });

  } finally {
    await client.end();
  }
}

checkProductsTable();
