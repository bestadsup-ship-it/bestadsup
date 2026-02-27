import { Handler } from '@netlify/functions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from './utils/db';

const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  account_type: z.enum(['creator', 'buyer', 'hybrid']).default('creator'),
});

// Validate JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Security headers
const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: SECURITY_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, password, account_type } = SignupSchema.parse(body);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const pool = getPool();

    // Use bcrypt with salt rounds of 12 for better security
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO accounts (name, email, password_hash, account_type, failed_login_attempts, created_at)
       VALUES ($1, $2, $3, $4, 0, NOW())
       RETURNING id, name, email, username, account_type`,
      [name.trim(), normalizedEmail, passwordHash, account_type]
    );

    const account = result.rows[0];

    const token = jwt.sign(
      { accountId: account.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 201,
      headers: SECURITY_HEADERS,
      body: JSON.stringify({
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          username: account.username,
          account_type: account.account_type,
        },
        token
      }),
    };
  } catch (error: any) {
    // Sanitized error logging
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: SECURITY_HEADERS,
        body: JSON.stringify({
          error: 'Invalid input',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }),
      };
    }

    // Database duplicate email error
    if (error.code === '23505') {
      return {
        statusCode: 400,
        headers: SECURITY_HEADERS,
        body: JSON.stringify({ error: 'Email already exists' }),
      };
    }

    console.error('Signup error:', {
      message: error.message,
      code: error.code,
    });

    return {
      statusCode: 500,
      headers: SECURITY_HEADERS,
      body: JSON.stringify({
        error: 'An error occurred during signup. Please try again.'
      }),
    };
  }
};
