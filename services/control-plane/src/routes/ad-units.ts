import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';
import { z } from 'zod';

const router = Router();

const AdUnitSchema = z.object({
  property_id: z.string().uuid(),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ad_units WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { property_id, name, width, height } = AdUnitSchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO ad_units (property_id, account_id, name, width, height) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [property_id, req.accountId, name, width, height]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ad_units WHERE id = $1 AND account_id = $2',
      [req.params.id, req.accountId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ad unit not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as adUnitsRouter };
