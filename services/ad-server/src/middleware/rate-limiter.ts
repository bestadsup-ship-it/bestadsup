import { Request, Response, NextFunction } from 'express';
import { getCache } from '../cache';
import { ERROR_REASONS } from '@b2b-ad-platform/shared';
import { metrics } from '../metrics';

const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 1000;

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/metrics') {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;

    const cache = getCache();
    const current = await cache.get(key);

    if (current && parseInt(current) >= MAX_REQUESTS_PER_WINDOW) {
      metrics.noFillReasonCounter.inc({ reason: ERROR_REASONS.RATE_LIMIT });
      res.status(200).json({
        creative_url: null,
        tracking_pixels: [],
      });
      return;
    }

    // Increment counter
    const multi = cache.multi();
    multi.incr(key);
    multi.expire(key, RATE_LIMIT_WINDOW);
    await multi.exec();

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Continue on error to avoid blocking requests
    next();
  }
}
