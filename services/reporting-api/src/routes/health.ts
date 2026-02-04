import { Router } from 'express';
import { getDatabase } from '../db';
import { getCache } from '../cache';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Check database connection
    const db = getDatabase();
    await db.query('SELECT 1');

    // Check Redis connection
    const cache = getCache();
    await cache.ping();

    res.json({
      status: 'ok',
      service: 'reporting-api',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      service: 'reporting-api',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRouter };
