import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import { z } from 'zod';
import { checkRateLimit, recordFailedLogin, securityHeaders } from '../utils/auth-security';

const router = Router();

const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  account_type: z.enum(['creator', 'buyer'], {
    errorMap: () => ({ message: 'Account type must be either "creator" or "buyer"' })
  }),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Helper to get JWT_SECRET with validation
function getJWT_SECRET(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return process.env.JWT_SECRET;
}

// Middleware to add security headers
router.use((req, res, next) => {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, account_type } = SignupSchema.parse(req.body);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Use bcrypt with salt rounds of 12 for better security
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO accounts (name, email, password_hash, account_type, failed_login_attempts, created_at)
       VALUES ($1, $2, $3, $4, 0, NOW())
       RETURNING id, name, email, account_type`,
      [name.trim(), normalizedEmail, passwordHash, account_type]
    );

    const account = result.rows[0];

    const token = jwt.sign(
      { accountId: account.id, accountType: account.account_type },
      getJWT_SECRET(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        account_type: account.account_type,
      },
      token
    });
  } catch (error: any) {
    // Sanitized error logging
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }

    // Database duplicate email error
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }

    console.error('Signup error:', {
      message: error.message,
      code: error.code,
    });

    res.status(500).json({
      error: 'An error occurred during signup. Please try again.'
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get client IP for rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                     req.ip ||
                     'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIp, normalizedEmail);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Check for account lockout
    const lockoutCheck = await pool.query(
      `SELECT failed_login_attempts, last_failed_login, locked_until
       FROM accounts WHERE email = $1`,
      [normalizedEmail]
    );

    if (lockoutCheck.rows.length > 0) {
      const account = lockoutCheck.rows[0];
      if (account.locked_until && new Date(account.locked_until) > new Date()) {
        return res.status(423).json({
          error: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
        });
      }
    }

    // Query account
    const result = await pool.query(
      `SELECT id, name, email, password_hash, account_type, failed_login_attempts
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
        await recordFailedLogin(pool, account.id);
      }

      // Always return same error message
      return res.status(401).json({ error: 'Invalid credentials' });
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
      { accountId: account.id, accountType: account.account_type },
      getJWT_SECRET(),
      { expiresIn: '7d' }
    );

    res.json({
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        account_type: account.account_type,
      },
      token,
    });
  } catch (error: any) {
    // Sanitized error logging
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }

    console.error('Login error:', {
      message: error.message,
      code: error.code,
    });

    res.status(500).json({
      error: 'An error occurred during login. Please try again.'
    });
  }
});

export { router as authRouter };
