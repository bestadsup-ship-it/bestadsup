import { Router } from 'express';
import { getPool } from '../db';
import { getCache } from '../cache';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown',
      cache: 'unknown',
    };

    try {
      // Check database
      const pool = getPool();
      await pool.query('SELECT 1');
      health.database = 'ok';
    } catch (error) {
      health.database = 'error';
      health.status = 'degraded';
    }

    try {
      // Check cache
      const cache = getCache();
      await cache.ping();
      health.cache = 'ok';
    } catch (error) {
      health.cache = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  return router;
}
