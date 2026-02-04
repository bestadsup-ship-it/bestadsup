import { AdRequest } from '@b2b-ad-platform/shared';
import { query } from '../db';

interface AdDecision {
  creative_url: string | null;
  tracking_pixels: string[];
  campaign_id?: string;
  creative_id?: string;
  no_fill_reason?: string;
}

export async function logAdRequest(
  adRequest: AdRequest,
  adDecision: AdDecision
): Promise<void> {
  try {
    // Get account_id from ad_unit
    const result = await query<{ account_id: string }>(`
      SELECT account_id FROM ad_units WHERE id = $1
    `, [adRequest.ad_unit_id]);

    if (result.length === 0) {
      console.warn('Ad unit not found for logging:', adRequest.ad_unit_id);
      return;
    }

    const accountId = result[0].account_id;

    // Log the request
    await query(`
      INSERT INTO ad_requests (ad_unit_id, account_id, filled, no_fill_reason, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      adRequest.ad_unit_id,
      accountId,
      adDecision.creative_url !== null,
      adDecision.no_fill_reason || null,
    ]);

  } catch (error) {
    console.error('Failed to log ad request:', error);
    // Don't throw - logging is non-critical
  }
}
