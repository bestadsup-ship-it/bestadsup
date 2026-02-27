import jwt from 'jsonwebtoken';
import { Handler, HandlerEvent } from '@netlify/functions';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export interface AuthContext {
  accountId: string;
  isAdmin?: boolean;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_ATTEMPTS = 10;
const ACCOUNT_LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// In-memory rate limit store (for serverless, consider using Redis in production)
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export async function checkRateLimit(ip: string, email: string): Promise<RateLimitResult> {
  const key = `${ip}:${email}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, { attempts: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.attempts++;
  return { allowed: true };
}

export async function recordFailedLogin(pool: Pool, accountId: string, email: string): Promise<void> {
  const result = await pool.query(
    `UPDATE accounts
     SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
         last_failed_login = NOW()
     WHERE id = $1
     RETURNING failed_login_attempts`,
    [accountId]
  );

  const attempts = result.rows[0]?.failed_login_attempts || 0;

  // Lock account if exceeded max attempts
  if (attempts >= ACCOUNT_LOCKOUT_ATTEMPTS) {
    await pool.query(
      `UPDATE accounts
       SET locked_until = NOW() + INTERVAL '30 minutes'
       WHERE id = $1`,
      [accountId]
    );
  }
}

export function verifyToken(event: HandlerEvent): AuthContext {
  const authHeader = event.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);

  // Validate JWT_SECRET exists
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { accountId: string };
    return { accountId: decoded.accountId };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function withAuth(handler: (event: HandlerEvent, context: AuthContext) => Promise<any>): Handler {
  return async (event) => {
    try {
      const authContext = verifyToken(event);
      return await handler(event, authContext);
    } catch (error: any) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: error.message || 'Unauthorized' }),
      };
    }
  };
}

export function withAdminAuth(handler: (event: HandlerEvent, context: AuthContext) => Promise<any>): Handler {
  return async (event) => {
    try {
      const authContext = verifyToken(event);

      // Check if user is admin
      const result = await pool.query(
        'SELECT is_admin FROM accounts WHERE id = $1',
        [authContext.accountId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_admin) {
        return {
          statusCode: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
        };
      }

      authContext.isAdmin = true;
      return await handler(event, authContext);
    } catch (error: any) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: error.message || 'Unauthorized' }),
      };
    }
  };
}
