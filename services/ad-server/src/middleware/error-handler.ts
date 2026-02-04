import { Request, Response, NextFunction } from 'express';
import { AdServerError } from '@b2b-ad-platform/shared';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AdServerError) {
    res.status(err.statusCode).json({
      error: err.message,
      reason: err.reason,
    });
    return;
  }

  // Never return 5xx to client - fail closed with empty response
  res.status(200).json({
    creative_url: null,
    tracking_pixels: [],
  });
}
