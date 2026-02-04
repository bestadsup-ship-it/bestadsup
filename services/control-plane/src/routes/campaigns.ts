import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';
import { z } from 'zod';

const router = Router();

const CampaignSchema = z.object({
  name: z.string().min(1),
  cpm: z.number().positive(),
  status: z.enum(['active', 'paused', 'completed']),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, cpm, status, start_date, end_date } = CampaignSchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO campaigns (account_id, name, cpm, status, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.accountId, name, cpm, status, start_date, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND account_id = $2',
      [req.params.id, req.accountId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const updates = CampaignSchema.partial().parse(req.body);
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE campaigns SET ${setClause} WHERE id = $1 AND account_id = $${fields.length + 2} RETURNING *`,
      [req.params.id, ...values, req.accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as campaignsRouter };
