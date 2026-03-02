import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { buildAuthorizationUrl, isOAuthConfigured } from '../config/oauth';

const router = Router();

// Validation schemas
const createVerificationRequestSchema = z.object({
  requestType: z.enum(['ga4', 'hubspot', 'stripe', 'manual']),
  requestData: z.object({
    // For OAuth requests
    authCode: z.string().optional(),
    redirectUri: z.string().optional(),
    // For manual requests
    screenshots: z.array(z.string()).optional(),
    description: z.string().optional(),
    metricsClaimed: z.array(z.object({
      metricName: z.string(),
      metricValue: z.number(),
      metricUnit: z.string().optional(),
      timePeriod: z.string().optional(),
    })).optional(),
  }),
});

const addVerifiedMetricSchema = z.object({
  dataSource: z.enum(['ga4', 'hubspot', 'stripe', 'manual']),
  metricName: z.string().min(1).max(100),
  metricValue: z.number(),
  metricUnit: z.string().max(50).optional(),
  timePeriod: z.string().max(50).optional(),
  verificationProofUrl: z.string().optional(),
  projectId: z.number().optional(),
  metadata: z.any().optional(),
});

// GET /verification/badges - Get current user's verification badges
router.get('/badges', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        id,
        badge_type,
        badge_level,
        verified_at,
        expires_at,
        metadata
      FROM verification_badges
      WHERE account_id = $1
      ORDER BY verified_at DESC`,
      [accountId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      type: row.badge_type,
      level: row.badge_level,
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at,
      metadata: row.metadata,
    })));
  } catch (error) {
    console.error('Error fetching verification badges:', error);
    res.status(500).json({ message: 'Failed to fetch verification badges' });
  }
});

// GET /verification/metrics - Get current user's verified metrics
router.get('/metrics', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { verified_only = 'true' } = req.query;

    let query = `
      SELECT
        id,
        data_source,
        metric_name,
        metric_value,
        metric_unit,
        time_period,
        is_verified,
        verified_at,
        verification_proof_url,
        project_id,
        metadata,
        created_at
      FROM verification_data
      WHERE account_id = $1
    `;

    if (verified_only === 'true') {
      query += ' AND is_verified = true';
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, [accountId]);

    res.json(result.rows.map(row => ({
      id: row.id,
      dataSource: row.data_source,
      metricName: row.metric_name,
      metricValue: parseFloat(row.metric_value),
      metricUnit: row.metric_unit,
      timePeriod: row.time_period,
      isVerified: row.is_verified,
      verifiedAt: row.verified_at,
      verificationProofUrl: row.verification_proof_url,
      projectId: row.project_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching verified metrics:', error);
    res.status(500).json({ message: 'Failed to fetch verified metrics' });
  }
});

// POST /verification/metrics - Add a new verified metric
router.post('/metrics', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = addVerifiedMetricSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO verification_data (
        account_id,
        data_source,
        metric_name,
        metric_value,
        metric_unit,
        time_period,
        is_verified,
        verified_at,
        verification_proof_url,
        project_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        accountId,
        data.dataSource,
        data.metricName,
        data.metricValue,
        data.metricUnit || null,
        data.timePeriod || null,
        false, // Starts as unverified
        null,
        data.verificationProofUrl || null,
        data.projectId || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    const metric = result.rows[0];

    res.status(201).json({
      id: metric.id,
      dataSource: metric.data_source,
      metricName: metric.metric_name,
      metricValue: parseFloat(metric.metric_value),
      metricUnit: metric.metric_unit,
      timePeriod: metric.time_period,
      isVerified: metric.is_verified,
      verifiedAt: metric.verified_at,
      verificationProofUrl: metric.verification_proof_url,
      projectId: metric.project_id,
      metadata: metric.metadata,
      createdAt: metric.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid metric data',
        errors: error.errors,
      });
    }
    console.error('Error adding verified metric:', error);
    res.status(500).json({ message: 'Failed to add verified metric' });
  }
});

// GET /verification/requests - Get current user's verification requests
router.get('/requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        id,
        request_type,
        status,
        request_data,
        reviewer_notes,
        reviewed_at,
        created_at,
        updated_at
      FROM verification_requests
      WHERE account_id = $1
      ORDER BY created_at DESC`,
      [accountId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      requestType: row.request_type,
      status: row.status,
      requestData: row.request_data,
      reviewerNotes: row.reviewer_notes,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    res.status(500).json({ message: 'Failed to fetch verification requests' });
  }
});

// POST /verification/requests - Create a new verification request
router.post('/requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = createVerificationRequestSchema.parse(req.body);

    // Check if there's already a pending request of this type
    const existingRequest = await pool.query(
      `SELECT id FROM verification_requests
       WHERE account_id = $1 AND request_type = $2 AND status = 'pending'
       LIMIT 1`,
      [accountId, data.requestType]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        message: 'You already have a pending verification request of this type',
      });
    }

    const result = await pool.query(
      `INSERT INTO verification_requests (
        account_id,
        request_type,
        status,
        request_data
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        accountId,
        data.requestType,
        'pending',
        JSON.stringify(data.requestData),
      ]
    );

    const request = result.rows[0];

    res.status(201).json({
      id: request.id,
      requestType: request.request_type,
      status: request.status,
      requestData: request.request_data,
      createdAt: request.created_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid verification request data',
        errors: error.errors,
      });
    }
    console.error('Error creating verification request:', error);
    res.status(500).json({ message: 'Failed to create verification request' });
  }
});

// GET /verification/connections - Get third-party API connections
router.get('/connections', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        id,
        service_name,
        connection_status,
        connected_at,
        last_sync_at,
        token_expires_at,
        metadata
      FROM third_party_connections
      WHERE account_id = $1
      ORDER BY service_name`,
      [accountId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      serviceName: row.service_name,
      connectionStatus: row.connection_status,
      connectedAt: row.connected_at,
      lastSyncAt: row.last_sync_at,
      tokenExpiresAt: row.token_expires_at,
      metadata: row.metadata,
    })));
  } catch (error) {
    console.error('Error fetching third-party connections:', error);
    res.status(500).json({ message: 'Failed to fetch third-party connections' });
  }
});

// GET /verification/stats - Get aggregated verification statistics
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const [badgesResult, metricsResult, accountResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as count, badge_level FROM verification_badges WHERE account_id = $1 GROUP BY badge_level',
        [accountId]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM verification_data WHERE account_id = $1 AND is_verified = true',
        [accountId]
      ),
      pool.query(
        'SELECT verification_level, verification_score, has_verified_results FROM accounts WHERE id = $1',
        [accountId]
      ),
    ]);

    const badgeStats = badgesResult.rows.reduce((acc: any, row: any) => {
      acc[row.badge_level] = parseInt(row.count);
      return acc;
    }, { verified: 0, partial: 0, none: 0 });

    const account = accountResult.rows[0];

    res.json({
      verificationLevel: account?.verification_level || 'none',
      verificationScore: account?.verification_score || 0,
      hasVerifiedResults: account?.has_verified_results || false,
      badgesCount: {
        verified: badgeStats.verified,
        partial: badgeStats.partial,
      },
      verifiedMetricsCount: parseInt(metricsResult.rows[0].count),
    });
  } catch (error) {
    console.error('Error fetching verification stats:', error);
    res.status(500).json({ message: 'Failed to fetch verification stats' });
  }
});

// POST /verification/oauth/initiate - Initiate OAuth flow for a service
router.post('/oauth/initiate', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { serviceName } = req.body;

    // Validate service name
    const validServices = ['ga4', 'hubspot', 'stripe'];
    if (!validServices.includes(serviceName)) {
      return res.status(400).json({ message: 'Invalid service name' });
    }

    // Check if OAuth is configured for this service
    if (isOAuthConfigured(serviceName)) {
      // Real OAuth flow
      // 1. Generate a state token for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');

      // 2. Store state token in database with expiration (15 minutes)
      await pool.query(
        `INSERT INTO verification_connections (
          account_id,
          provider,
          connection_status,
          metadata
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (account_id, provider)
        DO UPDATE SET metadata = $4`,
        [
          accountId,
          serviceName,
          'pending',
          JSON.stringify({ state, expires_at: Date.now() + 15 * 60 * 1000 })
        ]
      );

      // 3. Build the OAuth authorization URL
      const authUrl = buildAuthorizationUrl(serviceName, state);

      if (!authUrl) {
        return res.status(500).json({ message: 'Failed to build authorization URL' });
      }

      // 4. Return the authorization URL for frontend to redirect to
      res.json({
        success: true,
        mode: 'oauth',
        authorizationUrl: authUrl,
        message: `Redirecting to ${serviceName} for authorization`
      });
    } else {
      // Demo mode - OAuth credentials not configured
      // Create a placeholder connection for demonstration
      const result = await pool.query(
        `INSERT INTO third_party_connections (
          account_id,
          service_name,
          connection_status,
          connected_at,
          metadata
        ) VALUES ($1, $2, $3, NOW(), $4)
        ON CONFLICT (account_id, service_name)
        DO UPDATE SET
          connection_status = $3,
          connected_at = NOW(),
          metadata = $4
        RETURNING id`,
        [
          accountId,
          serviceName,
          'connected',
          JSON.stringify({ demo: true, message: 'OAuth credentials not configured - demo mode' }),
        ]
      );

      res.json({
        success: true,
        mode: 'demo',
        message: `Demo connection created for ${serviceName}`,
        connectionId: result.rows[0].id
      });
    }
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    res.status(500).json({ message: 'Failed to initiate OAuth flow' });
  }
});

// GET /verification/oauth/callback/:serviceName - OAuth callback endpoint
router.get('/oauth/callback/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { code, state, error } = req.query;

    // Validate service name
    const validServices = ['ga4', 'hubspot', 'stripe'];
    if (!validServices.includes(serviceName)) {
      return res.redirect(`${process.env.FRONTEND_URL}/verification?error=invalid_service`);
    }

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/verification?error=oauth_denied`);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/verification?error=missing_params`);
    }

    // TODO: Verify state token from database to prevent CSRF
    // TODO: Exchange authorization code for access token
    // TODO: Store encrypted tokens in verification_connections table
    // TODO: Pull initial metrics data from the service

    // For now, redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3005'}/verification?connected=${serviceName}`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3005'}/verification?error=callback_failed`);
  }
});

// DELETE /verification/connections/:serviceName - Disconnect a third-party service
router.delete('/connections/:serviceName', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { serviceName } = req.params;

    // Delete the connection
    const result = await pool.query(
      `DELETE FROM third_party_connections
       WHERE account_id = $1 AND service_name = $2
       RETURNING id`,
      [accountId, serviceName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Also delete all verification data from this source
    await pool.query(
      `DELETE FROM verification_data
       WHERE account_id = $1 AND data_source = $2`,
      [accountId, serviceName]
    );

    // Recalculate verification score
    // In production, this would trigger a background job to recalculate badges and scores

    res.json({ message: 'Service disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting service:', error);
    res.status(500).json({ message: 'Failed to disconnect service' });
  }
});

export default router;
