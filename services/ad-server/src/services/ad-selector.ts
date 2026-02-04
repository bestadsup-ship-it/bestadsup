import { AdRequest, ERROR_REASONS } from '@b2b-ad-platform/shared';
import { query } from '../db';
import { getCached, setCached } from '../cache';
import { metrics } from '../metrics';

interface AdDecision {
  creative_url: string | null;
  tracking_pixels: string[];
  campaign_id?: string;
  creative_id?: string;
  no_fill_reason?: string;
}

interface CampaignCreative {
  campaign_id: string;
  campaign_name: string;
  creative_id: string;
  creative_url: string;
  click_url: string;
  priority: number;
  account_id: string;
}

export async function selectAd(adRequest: AdRequest): Promise<AdDecision> {
  const startTime = Date.now();

  try {
    // Try cache first
    const cacheKey = `ad_unit:${adRequest.ad_unit_id}`;
    let eligibleAds = await getCached<CampaignCreative[]>(cacheKey);

    if (eligibleAds) {
      metrics.cacheHitCounter.inc({ cache_key_type: 'ad_unit' });
    } else {
      metrics.cacheMissCounter.inc({ cache_key_type: 'ad_unit' });

      // Query database for eligible campaigns
      const queryStart = Date.now();
      eligibleAds = await query<CampaignCreative>(`
        SELECT
          c.id as campaign_id,
          c.name as campaign_name,
          cr.id as creative_id,
          cr.creative_url,
          cr.click_url,
          auc.priority,
          auc.account_id
        FROM ad_unit_campaigns auc
        INNER JOIN campaigns c ON c.id = auc.campaign_id
        INNER JOIN creatives cr ON cr.campaign_id = c.id
        INNER JOIN ad_units au ON au.id = auc.ad_unit_id
        WHERE
          auc.ad_unit_id = $1
          AND c.status = 'active'
          AND c.start_date <= NOW()
          AND (c.end_date IS NULL OR c.end_date >= NOW())
          AND cr.width = au.width
          AND cr.height = au.height
        ORDER BY auc.priority DESC, RANDOM()
        LIMIT 1
      `, [adRequest.ad_unit_id]);

      const queryDuration = Date.now() - queryStart;
      metrics.dbQueryDuration.observe({ query_type: 'select_ad' }, queryDuration);

      // Cache for 5 minutes
      if (eligibleAds && eligibleAds.length > 0) {
        await setCached(cacheKey, eligibleAds, 300);
      }
    }

    // No eligible campaigns
    if (!eligibleAds || eligibleAds.length === 0) {
      return {
        creative_url: null,
        tracking_pixels: [],
        no_fill_reason: ERROR_REASONS.NO_ACTIVE_CAMPAIGN,
      };
    }

    // Select the first ad (already sorted by priority)
    const selectedAd = eligibleAds[0];

    // Build tracking pixel URL
    const analyticsUrl = process.env.ANALYTICS_INGEST_URL || 'http://localhost:3003';
    const trackingPixel = `${analyticsUrl}/event/impression?` +
      `ad_unit_id=${adRequest.ad_unit_id}` +
      `&campaign_id=${selectedAd.campaign_id}` +
      `&creative_id=${selectedAd.creative_id}` +
      `&page_url=${encodeURIComponent(adRequest.page_url)}` +
      `&timestamp=${Date.now()}`;

    const totalDuration = Date.now() - startTime;
    console.log(`Ad selection completed in ${totalDuration}ms`);

    return {
      creative_url: selectedAd.creative_url,
      tracking_pixels: [trackingPixel],
      campaign_id: selectedAd.campaign_id,
      creative_id: selectedAd.creative_id,
    };

  } catch (error) {
    console.error('Ad selection error:', error);
    return {
      creative_url: null,
      tracking_pixels: [],
      no_fill_reason: ERROR_REASONS.INTERNAL_ERROR,
    };
  }
}
