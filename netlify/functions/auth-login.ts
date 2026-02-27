import { Handler } from '@netlify/functions';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from './utils/db';
import { checkRateLimit, recordFailedLogin } from './utils/auth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
    const { email, password } = LoginSchema.parse(body);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get client IP for rate limiting
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0] ||
                     event.headers['client-ip'] ||
                     'unknown';

    // Check rate limit
    const rateLimitResult = await checkRateLimit(clientIp, normalizedEmail);
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: SECURITY_HEADERS,
        body: JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }),
      };
    }

    const pool = getPool();

    // Check for account lockout
    const lockoutCheck = await pool.query(
      `SELECT failed_login_attempts, last_failed_login, locked_until
       FROM accounts WHERE email = $1`,
      [normalizedEmail]
    );

    if (lockoutCheck.rows.length > 0) {
      const account = lockoutCheck.rows[0];
      if (account.locked_until && new Date(account.locked_until) > new Date()) {
        return {
          statusCode: 423,
          headers: SECURITY_HEADERS,
          body: JSON.stringify({
            error: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
          }),
        };
      }
    }

    // Query account
    const result = await pool.query(
      `SELECT id, name, email, username, password_hash, failed_login_attempts
       FROM accounts WHERE email = $1`,
      [normalizedEmail]
    );

    // Use constant-time comparison approach
    // Always hash even if user doesn't exist to prevent timing attacks
    const dummyHash = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV';
    const accountExists = result.rows.length > 0;
    const account = accountExists ? result.rows[0] : null;
    const hashToCompare = accountExists ? account.password_hash : dummyHash;

    const valid = await bcrypt.compare(password, hashToCompare);

    if (!accountExists || !valid) {
      // Record failed login attempt
      if (accountExists) {
        await recordFailedLogin(pool, account.id, normalizedEmail);
      }

      // Always return same error message
      return {
        statusCode: 401,
        headers: SECURITY_HEADERS,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Reset failed login attempts on successful login
    await pool.query(
      `UPDATE accounts
       SET failed_login_attempts = 0,
           last_failed_login = NULL,
           locked_until = NULL,
           last_login = NOW()
       WHERE id = $1`,
      [account.id]
    );

    const token = jwt.sign(
      { accountId: account.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: SECURITY_HEADERS,
      body: JSON.stringify({
        account: {
          id: account.id,
          name: account.name,
          email: account.email,
          username: account.username,
        },
        token,
      }),
    };
  } catch (error: any) {
    // Log error securely (don't log passwords or sensitive data)
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

    console.error('Login error:', {
      message: error.message,
      code: error.code,
      // Never log the full error object which might contain sensitive data
    });

    return {
      statusCode: 500,
      headers: SECURITY_HEADERS,
      body: JSON.stringify({
        error: 'An error occurred during login. Please try again.'
      }),
    };
  }
};
