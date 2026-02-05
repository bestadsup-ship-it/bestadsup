import { Handler } from '@netlify/functions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from './utils/db';

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { name, email, password } = SignupSchema.parse(JSON.parse(event.body || '{}'));
    const pool = getPool();

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO accounts (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    const account = result.rows[0];

    const token = jwt.sign(
      { accountId: account.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account, token }),
    };
  } catch (error: any) {
    console.error('Signup error:', error);

    if (error.code === '23505') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email already exists' }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message || 'Signup failed' }),
    };
  }
};
