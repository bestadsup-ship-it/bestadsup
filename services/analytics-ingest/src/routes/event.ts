import { Router, Request, Response } from 'express';
import { eventBuffer } from '../event-buffer';

export function createEventRouter(): Router {
  const router = Router();

  // POST /event/impression
  router.post('/impression', async (req: Request, res: Response) => {
    try {
      const { ad_unit_id, campaign_id, creative_id, page_url, timestamp } = req.query;

      // Validate required parameters
      if (!ad_unit_id || !campaign_id || !creative_id || !page_url) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Parse timestamp
      const eventTimestamp = timestamp
        ? new Date(Number(timestamp))
        : new Date();

      // Validate timestamp
      if (isNaN(eventTimestamp.getTime())) {
        return res.status(400).json({ error: 'Invalid timestamp' });
      }

      // Add to buffer (non-blocking)
      eventBuffer.addEvent({
        event_type: 'impression',
        ad_unit_id: ad_unit_id as string,
        campaign_id: campaign_id as string,
        creative_id: creative_id as string,
        page_url: page_url as string,
        timestamp: eventTimestamp,
        user_agent: req.headers['user-agent'],
      });

      // Add to metrics buffer
      eventBuffer.addMetrics(
        ad_unit_id as string,
        campaign_id as string,
        'impression',
        eventTimestamp
      );

      // Immediate response (fire-and-forget)
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking impression:', error);
      // Still return success to avoid blocking the client
      res.status(204).send();
    }
  });

  // POST /event/click
  router.post('/click', async (req: Request, res: Response) => {
    try {
      const { ad_unit_id, campaign_id, creative_id, page_url, timestamp } = req.query;

      // Validate required parameters
      if (!ad_unit_id || !campaign_id || !creative_id || !page_url) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Parse timestamp
      const eventTimestamp = timestamp
        ? new Date(Number(timestamp))
        : new Date();

      // Validate timestamp
      if (isNaN(eventTimestamp.getTime())) {
        return res.status(400).json({ error: 'Invalid timestamp' });
      }

      // Add to buffer (non-blocking)
      eventBuffer.addEvent({
        event_type: 'click',
        ad_unit_id: ad_unit_id as string,
        campaign_id: campaign_id as string,
        creative_id: creative_id as string,
        page_url: page_url as string,
        timestamp: eventTimestamp,
        user_agent: req.headers['user-agent'],
      });

      // Add to metrics buffer
      eventBuffer.addMetrics(
        ad_unit_id as string,
        campaign_id as string,
        'click',
        eventTimestamp
      );

      // Immediate response (fire-and-forget)
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still return success to avoid blocking the client
      res.status(204).send();
    }
  });

  return router;
}
