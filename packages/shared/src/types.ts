import { z } from 'zod';

// Ad Request Schema (from JS tag → Ad Server)
export const AdRequestSchema = z.object({
  ad_unit_id: z.string(),
  page_url: z.string().url(),
  user_agent: z.string(),
});

export type AdRequest = z.infer<typeof AdRequestSchema>;

// Ad Response Schema
export const AdResponseSchema = z.object({
  creative_url: z.string().url().nullable(),
  tracking_pixels: z.array(z.string().url()),
});

export type AdResponse = z.infer<typeof AdResponseSchema>;

// Analytics Event Types
export const ImpressionEventSchema = z.object({
  event_type: z.literal('impression'),
  ad_unit_id: z.string(),
  campaign_id: z.string(),
  creative_id: z.string(),
  page_url: z.string().url(),
  timestamp: z.number(),
  user_agent: z.string().optional(),
});

export const ClickEventSchema = z.object({
  event_type: z.literal('click'),
  ad_unit_id: z.string(),
  campaign_id: z.string(),
  creative_id: z.string(),
  page_url: z.string().url(),
  timestamp: z.number(),
  user_agent: z.string().optional(),
});

export const AnalyticsEventSchema = z.union([ImpressionEventSchema, ClickEventSchema]);

export type ImpressionEvent = z.infer<typeof ImpressionEventSchema>;
export type ClickEvent = z.infer<typeof ClickEventSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// Database Models
export interface Account {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Property {
  id: string;
  account_id: string;
  name: string;
  domain: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdUnit {
  id: string;
  property_id: string;
  account_id: string;
  name: string;
  width: number;
  height: number;
  created_at: Date;
  updated_at: Date;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  cpm: number; // Static CPM in cents
  status: 'active' | 'paused' | 'completed';
  start_date: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Creative {
  id: string;
  campaign_id: string;
  account_id: string;
  name: string;
  creative_url: string;
  width: number;
  height: number;
  click_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdUnitCampaign {
  id: string;
  ad_unit_id: string;
  campaign_id: string;
  account_id: string;
  priority: number; // Higher = served first
  created_at: Date;
}

// Metrics
export interface Metrics {
  impressions: number;
  clicks: number;
  revenue: number; // in cents
  fill_rate: number; // percentage
}

export interface DashboardMetrics extends Metrics {
  start_date: string;
  end_date: string;
  by_campaign?: Record<string, Metrics>;
  by_ad_unit?: Record<string, Metrics>;
}

// Error types
export class AdServerError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public reason?: string
  ) {
    super(message);
    this.name = 'AdServerError';
  }
}

// Constants
export const ERROR_REASONS = {
  NO_FILL: 'no_fill',
  INVALID_AD_UNIT: 'invalid_ad_unit',
  NO_ACTIVE_CAMPAIGN: 'no_active_campaign',
  RATE_LIMIT: 'rate_limit',
  INTERNAL_ERROR: 'internal_error',
} as const;

export const PERFORMANCE_BUDGETS = {
  AD_SERVER_P95_MS: 300,
  JS_TAG_TIMEOUT_MS: 500,
  JS_TAG_SIZE_KB: 10,
  ERROR_RATE_PERCENT: 0.1,
} as const;
