import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';
import { z } from 'zod';

const router = Router();

const CreativeSchema = z.object({
  campaign_id: z.string().uuid(),
  name: z.string().min(1),
  creative_url: z.string().url(),
  width: z.number().positive(),
  height: z.number().positive(),
  click_url: z.string().url(),
});

const AdUnitCampaignSchema = z.object({
  ad_unit_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  priority: z.number().int().default(0),
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM creatives WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { campaign_id, name, creative_url, width, height, click_url } = CreativeSchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO creatives (campaign_id, account_id, name, creative_url, width, height, click_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [campaign_id, req.accountId, name, creative_url, width, height, click_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Assign campaign to ad unit
router.post('/ad-unit-campaigns', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ad_unit_id, campaign_id, priority } = AdUnitCampaignSchema.parse(req.body);
    const result = await pool.query(
      'INSERT INTO ad_unit_campaigns (ad_unit_id, campaign_id, account_id, priority) VALUES ($1, $2, $3, $4) RETURNING *',
      [ad_unit_id, campaign_id, req.accountId, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/ad-unit-campaigns', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ad_unit_campaigns WHERE account_id = $1 ORDER BY created_at DESC',
      [req.accountId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as creativesRouter };
