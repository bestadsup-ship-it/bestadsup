import { Router, Request, Response, NextFunction } from 'express';
import { AdRequestSchema, AdResponse, ERROR_REASONS } from '@b2b-ad-platform/shared';
import { selectAd } from '../services/ad-selector';
import { logAdRequest } from '../services/ad-logger';
import { metrics } from '../metrics';

export function createAdRouter(): Router {
  const router = Router();

  router.post('/request', async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Validate request
      const validationResult = AdRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        metrics.noFillReasonCounter.inc({ reason: ERROR_REASONS.INVALID_AD_UNIT });
        metrics.adRequestCounter.inc({ ad_unit_id: 'invalid', filled: 'false' });

        res.status(200).json({
          creative_url: null,
          tracking_pixels: [],
        } as AdResponse);

        return;
      }

      const adRequest = validationResult.data;

      // Select ad (this is the critical path - must be fast!)
      const adDecision = await selectAd(adRequest);

      // Log request asynchronously (fire and forget)
      logAdRequest(adRequest, adDecision).catch(err => {
        console.error('Failed to log ad request:', err);
      });

      // Record metrics
      const duration = Date.now() - startTime;
      metrics.httpRequestDuration.observe(
        { method: 'POST', route: '/ad/request', status_code: '200' },
        duration
      );

      metrics.adRequestCounter.inc({
        ad_unit_id: adRequest.ad_unit_id,
        filled: adDecision.creative_url ? 'true' : 'false',
      });

      if (!adDecision.creative_url && adDecision.no_fill_reason) {
        metrics.noFillReasonCounter.inc({ reason: adDecision.no_fill_reason });
      }

      // Return response
      const response: AdResponse = {
        creative_url: adDecision.creative_url,
        tracking_pixels: adDecision.tracking_pixels,
      };

      res.status(200).json(response);

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.httpRequestDuration.observe(
        { method: 'POST', route: '/ad/request', status_code: '500' },
        duration
      );

      next(error);
    }
  });

  return router;
}
