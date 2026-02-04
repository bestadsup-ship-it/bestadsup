import { Pool } from 'pg';

let pool: Pool;

export async function initializeDatabase(): Promise<void> {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 30, // Higher pool for write-heavy workload
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}

// Non-blocking query wrapper
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

// Fire-and-forget query for async writes
export function fireAndForgetQuery(text: string, params?: any[]): void {
  pool.query(text, params).catch(error => {
    console.error('Fire-and-forget query error', { text, error });
  });
}
