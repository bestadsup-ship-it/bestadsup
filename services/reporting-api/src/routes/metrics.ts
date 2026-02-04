import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../db';
import { getCached, setCached } from '../cache';
import { z } from 'zod';
import { Metrics } from '@b2b-ad-platform/shared';

const router = Router();

// Query parameter validation schema
const MetricsQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ad_unit_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // Validate query parameters
    const { start_date, end_date, ad_unit_id, campaign_id } = MetricsQuerySchema.parse(req.query);

    // Generate cache key based on query parameters
    const cacheKey = `metrics:${req.accountId}:${start_date}:${end_date}:${ad_unit_id || 'all'}:${campaign_id || 'all'}`;

    // Check cache first
    const cachedMetrics = await getCached<Metrics>(cacheKey);
    if (cachedMetrics) {
      res.json(cachedMetrics);
      return;
    }

    const db = getDatabase();

    // Build the WHERE clause for metrics_hourly query
    const whereConditions = ['account_id = $1', 'hour_timestamp >= $2', 'hour_timestamp < $3'];
    const queryParams: any[] = [req.accountId, start_date, end_date];
    let paramIndex = 4;

    if (ad_unit_id) {
      whereConditions.push(`ad_unit_id = $${paramIndex}`);
      queryParams.push(ad_unit_id);
      paramIndex++;
    }

    if (campaign_id) {
      whereConditions.push(`campaign_id = $${paramIndex}`);
      queryParams.push(campaign_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Query aggregated metrics from metrics_hourly table
    const metricsQuery = `
      SELECT
        COALESCE(SUM(impressions), 0)::int as impressions,
        COALESCE(SUM(clicks), 0)::int as clicks,
        COALESCE(SUM(revenue_cents), 0)::int as revenue
      FROM metrics_hourly
      WHERE ${whereClause}
    `;

    const metricsResult = await db.query(metricsQuery, queryParams);
    const metricsData = metricsResult.rows[0];

    // Build WHERE clause for ad_requests (fill rate calculation)
    const requestsWhereConditions = ['account_id = $1', 'timestamp >= $2', 'timestamp < $3'];
    const requestsParams: any[] = [req.accountId, start_date, end_date];
    let requestsParamIndex = 4;

    if (ad_unit_id) {
      requestsWhereConditions.push(`ad_unit_id = $${requestsParamIndex}`);
      requestsParams.push(ad_unit_id);
      requestsParamIndex++;
    }

    const requestsWhereClause = requestsWhereConditions.join(' AND ');

    // Query ad_requests for fill rate calculation
    const fillRateQuery = `
      SELECT
        COUNT(*)::int as total_requests,
        COUNT(*) FILTER (WHERE filled = true)::int as filled_requests
      FROM ad_requests
      WHERE ${requestsWhereClause}
    `;

    const fillRateResult = await db.query(fillRateQuery, requestsParams);
    const fillRateData = fillRateResult.rows[0];

    // Calculate fill rate as a percentage
    const fillRate = fillRateData.total_requests > 0
      ? (fillRateData.filled_requests / fillRateData.total_requests) * 100
      : 0;

    // Construct the metrics response
    const metrics: Metrics = {
      impressions: metricsData.impressions,
      clicks: metricsData.clicks,
      revenue: metricsData.revenue,
      fill_rate: Math.round(fillRate * 100) / 100, // Round to 2 decimal places
    };

    // Cache the result for 5 minutes (300 seconds)
    await setCached(cacheKey, metrics, 300);

    res.json(metrics);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }

    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as metricsRouter };
