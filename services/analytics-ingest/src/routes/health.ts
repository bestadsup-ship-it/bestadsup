import { Router, Request, Response } from 'express';
import { getPool } from '../db';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      // Check database connection
      const pool = getPool();
      const result = await pool.query('SELECT NOW()');

      res.status(200).json({
        status: 'healthy',
        service: 'analytics-ingest',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: process.uptime(),
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        service: 'analytics-ingest',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  return router;
}
