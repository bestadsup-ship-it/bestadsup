import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM accounts WHERE id = $1',
      [req.accountId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as accountsRouter };
