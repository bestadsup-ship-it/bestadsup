import { getPool } from './db';

interface EventData {
  event_type: 'impression' | 'click';
  ad_unit_id: string;
  campaign_id: string;
  creative_id: string;
  page_url: string;
  timestamp: Date;
  user_agent?: string;
}

interface MetricsData {
  ad_unit_id: string;
  campaign_id: string;
  hour_timestamp: Date;
  impressions: number;
  clicks: number;
}

class EventBuffer {
  private eventBuffer: EventData[] = [];
  private metricsBuffer: Map<string, MetricsData> = new Map();
  private readonly maxBufferSize = 100; // Flush after 100 events
  private readonly flushInterval = 5000; // Flush every 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startFlushTimer();
  }

  // Add event to buffer
  addEvent(event: EventData): void {
    this.eventBuffer.push(event);

    // Immediate flush if buffer is full
    if (this.eventBuffer.length >= this.maxBufferSize) {
      this.flush().catch(error => {
        console.error('Failed to flush events:', error);
      });
    }
  }

  // Add metrics update to buffer
  addMetrics(adUnitId: string, campaignId: string, eventType: 'impression' | 'click', timestamp: Date): void {
    const hourTimestamp = this.getHourTimestamp(timestamp);
    const key = `${adUnitId}:${campaignId}:${hourTimestamp.toISOString()}`;

    const existing = this.metricsBuffer.get(key);
    if (existing) {
      if (eventType === 'impression') {
        existing.impressions++;
      } else {
        existing.clicks++;
      }
    } else {
      this.metricsBuffer.set(key, {
        ad_unit_id: adUnitId,
        campaign_id: campaignId,
        hour_timestamp: hourTimestamp,
        impressions: eventType === 'impression' ? 1 : 0,
        clicks: eventType === 'click' ? 1 : 0,
      });
    }
  }

  // Flush buffers to database
  async flush(): Promise<void> {
    const eventsToFlush = this.eventBuffer.splice(0);
    const metricsToFlush = Array.from(this.metricsBuffer.values());
    this.metricsBuffer.clear();

    if (eventsToFlush.length === 0 && metricsToFlush.length === 0) {
      return;
    }

    const pool = getPool();

    try {
      // Batch insert events
      if (eventsToFlush.length > 0) {
        // Pre-fetch all account IDs in one query
        const campaignIds = [...new Set(eventsToFlush.map(e => e.campaign_id))];
        await this.preloadAccountIds(campaignIds);

        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const event of eventsToFlush) {
          const accountId = await this.getAccountId(event.campaign_id);
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
          params.push(
            event.event_type,
            event.ad_unit_id,
            event.campaign_id,
            event.creative_id,
            accountId,
            event.page_url,
            event.timestamp
          );
          paramIndex += 7;
        }

        const insertEventsQuery = `
          INSERT INTO events (event_type, ad_unit_id, campaign_id, creative_id, account_id, page_url, timestamp)
          VALUES ${values.join(', ')}
        `;

        await pool.query(insertEventsQuery, params);
        console.log(`Flushed ${eventsToFlush.length} events to database`);
      }

      // Batch upsert metrics
      if (metricsToFlush.length > 0) {
        // Pre-fetch account IDs for metrics
        const metricsCampaignIds = [...new Set(metricsToFlush.map(m => m.campaign_id))];
        await this.preloadAccountIds(metricsCampaignIds);

        for (const metric of metricsToFlush) {
          const accountId = await this.getAccountId(metric.campaign_id);
          const upsertMetricsQuery = `
            INSERT INTO metrics_hourly (account_id, ad_unit_id, campaign_id, hour_timestamp, impressions, clicks)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (account_id, ad_unit_id, campaign_id, hour_timestamp)
            DO UPDATE SET
              impressions = metrics_hourly.impressions + EXCLUDED.impressions,
              clicks = metrics_hourly.clicks + EXCLUDED.clicks,
              updated_at = CURRENT_TIMESTAMP
          `;

          await pool.query(upsertMetricsQuery, [
            accountId,
            metric.ad_unit_id,
            metric.campaign_id,
            metric.hour_timestamp,
            metric.impressions,
            metric.clicks,
          ]);
        }
        console.log(`Flushed ${metricsToFlush.length} metrics to database`);
      }
    } catch (error) {
      console.error('Error flushing buffers:', error);
      // Re-add failed events back to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
      throw error;
    }
  }

  // Get hour timestamp for aggregation
  private getHourTimestamp(date: Date): Date {
    const hour = new Date(date);
    hour.setMinutes(0, 0, 0);
    return hour;
  }

  // Cache for account IDs to reduce queries
  private accountIdCache = new Map<string, string>();

  // Preload multiple account IDs in a single query
  private async preloadAccountIds(campaignIds: string[]): Promise<void> {
    const uncachedIds = campaignIds.filter(id => !this.accountIdCache.has(id));

    if (uncachedIds.length === 0) {
      return;
    }

    const pool = getPool();
    const placeholders = uncachedIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT id, account_id FROM campaigns WHERE id IN (${placeholders})`,
      uncachedIds
    );

    for (const row of result.rows) {
      this.accountIdCache.set(row.id, row.account_id);
    }
  }

  private async getAccountId(campaignId: string): Promise<string> {
    if (this.accountIdCache.has(campaignId)) {
      return this.accountIdCache.get(campaignId)!;
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT account_id FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const accountId = result.rows[0].account_id;
    this.accountIdCache.set(campaignId, accountId);
    return accountId;
  }

  // Start periodic flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Periodic flush error:', error);
      });
    }, this.flushInterval);
  }

  // Cleanup on shutdown
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

// Singleton instance
export const eventBuffer = new EventBuffer();
