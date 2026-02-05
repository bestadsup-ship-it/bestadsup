import { Handler } from '@netlify/functions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from './utils/db';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Login request body:', event.body);
    const body = JSON.parse(event.body || '{}');
    console.log('Parsed body:', body);
    const { email, password } = LoginSchema.parse(body);
    const pool = getPool();

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM accounts WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    const account = result.rows[0];
    const valid = await bcrypt.compare(password, account.password_hash);

    if (!valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    const token = jwt.sign(
      { accountId: account.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
        },
        token,
      }),
    };
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message || 'Login failed',
        details: error.errors || undefined
      }),
    };
  }
};
