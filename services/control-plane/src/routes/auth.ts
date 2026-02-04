import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import { z } from 'zod';

const router = Router();

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = SignupSchema.parse(req.body);

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

    res.status(201).json({ account, token });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM accounts WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const account = result.rows[0];
    const valid = await bcrypt.compare(password, account.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { accountId: account.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
      },
      token,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as authRouter };
