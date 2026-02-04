import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';
import { z } from 'zod';

const router = Router();

const PropertySchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM properties WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, domain } = PropertySchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO properties (account_id, name, domain) VALUES ($1, $2, $3) RETURNING *',
      [req.accountId, name, domain]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM properties WHERE id = $1 AND account_id = $2',
      [req.params.id, req.accountId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as propertiesRouter };
