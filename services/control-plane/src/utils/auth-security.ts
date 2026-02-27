import { Pool } from 'pg';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_ATTEMPTS = 10;

// In-memory rate limit store (for development, use Redis in production)
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkRateLimit(ip: string, email: string): RateLimitResult {
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

export async function recordFailedLogin(pool: Pool, accountId: string): Promise<void> {
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

// Security headers middleware
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
