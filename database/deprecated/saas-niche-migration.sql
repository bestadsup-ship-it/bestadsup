-- SaaS Niche Positioning Migration
-- Transform platform to focus on SaaS/tech startup marketing creators
-- Date: 2026-02-27

-- ==============================================
-- STEP 1: UPDATE SERVICE CATEGORIES FOR SAAS FOCUS
-- ==============================================

-- Clear existing categories and insert SaaS-specific ones
TRUNCATE TABLE service_categories CASCADE;

INSERT INTO service_categories (name, slug, description, icon) VALUES
  ('SaaS Content Marketing', 'saas-content', 'Blog posts, SEO articles, product-led content for SaaS', '📝'),
  ('Product Launch Strategy', 'product-launch', 'GTM strategy, launch planning, Product Hunt campaigns', '🚀'),
  ('SaaS SEO & Growth', 'saas-seo', 'Technical SEO, content strategy, backlink building for SaaS', '🔍'),
  ('Paid Ads for SaaS', 'saas-paid-ads', 'Google Ads, LinkedIn Ads, Reddit Ads for B2B SaaS', '🎯'),
  ('SaaS Email & Automation', 'saas-email', 'Onboarding flows, drip campaigns, product emails', '📧'),
  ('Social Media for SaaS', 'saas-social', 'LinkedIn, Twitter/X, TikTok B2B content', '📱'),
  ('SaaS Copywriting', 'saas-copy', 'Landing pages, website copy, sales emails', '✍️'),
  ('Conversion Rate Optimization', 'cro', 'A/B testing, landing page optimization, signup flows', '📈'),
  ('SaaS Analytics & Metrics', 'saas-analytics', 'Dashboard setup, funnel analysis, growth metrics', '📊'),
  ('Community & Developer Marketing', 'dev-marketing', 'Developer relations, community building, technical content', '👨‍💻')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- ==============================================
-- STEP 2: ADD SAAS-SPECIFIC TAGS
-- ==============================================

-- Pre-seed SaaS-focused tags
INSERT INTO tags (name, normalized_name) VALUES
  ('#SaaSMarketing', 'saasmarketing'),
  ('#ProductLaunch', 'productlaunch'),
  ('#GrowthHacking', 'growthhacking'),
  ('#B2BMarketing', 'b2bmarketing'),
  ('#IndieHackers', 'indiehackers'),
  ('#Startup', 'startup'),
  ('#FounderStories', 'founderstories'),
  ('#SaaSGrowth', 'saasgrowth'),
  ('#ProductLed', 'productled'),
  ('#TechStartup', 'techstartup'),
  ('#MarTech', 'martech'),
  ('#CustomerAcquisition', 'customeracquisition'),
  ('#Retention', 'retention'),
  ('#PLG', 'plg'),
  ('#SaaSMetrics', 'saasmetrics'),
  ('#MRRGrowth', 'mrrgrowth'),
  ('#ChurnReduction', 'churnreduction'),
  ('#OnboardingFlow', 'onboardingflow'),
  ('#SaaSCopywriting', 'saascopywriting'),
  ('#DeveloperMarketing', 'developermarketing')
ON CONFLICT (normalized_name) DO NOTHING;

-- ==============================================
-- STEP 3: ADD SAAS-SPECIFIC PORTFOLIO METRICS
-- ==============================================

-- These will be used in portfolio posts for SaaS creators
-- Examples of metric labels creators can use:
-- - MRR Growth
-- - Sign-ups Generated
-- - Conversion Rate Lift
-- - Email Open Rate
-- - Demo Requests
-- - Organic Traffic Growth
-- - Product Hunt Ranking
-- - SQL/MQL Generated

-- Note: The portfolio_posts table already supports custom metrics via metric_label_1, metric_value_1, etc.
-- This is just documentation of recommended SaaS metrics

-- ==============================================
-- STEP 4: UPDATE SAMPLE DATA (OPTIONAL)
-- ==============================================

-- Commented out - only use if you want sample data for testing

/*
-- Sample SaaS marketing service
INSERT INTO products (
  creator_id,
  name,
  description,
  category,
  price,
  delivery_time_days,
  revisions_included,
  includes,
  requirements,
  is_active
) VALUES (
  (SELECT id FROM accounts WHERE email = 'creator@example.com' LIMIT 1),
  'SaaS Product Launch Package',
  'Complete go-to-market strategy for your SaaS launch. Includes Product Hunt campaign, content calendar, launch email sequences, and press outreach. Perfect for pre-seed to Series A startups.',
  'Product Launch Strategy',
  2500.00,
  14,
  2,
  ARRAY[
    'Product Hunt launch strategy & execution',
    '4-week content calendar',
    'Launch email sequence (5 emails)',
    'Press release & media outreach list',
    'Social media launch kit',
    '2 strategy calls',
    'Post-launch report'
  ],
  'Product demo access, brand assets, target customer description, launch timeline',
  TRUE
);

-- Sample portfolio post for SaaS creator
INSERT INTO posts (
  account_id,
  content,
  post_type,
  tags,
  client_name,
  client_industry,
  project_duration,
  metric_label_1,
  metric_value_1,
  metric_label_2,
  metric_value_2,
  metric_label_3,
  metric_value_3
) VALUES (
  (SELECT id FROM accounts WHERE email = 'creator@example.com' LIMIT 1),
  'Helped an early-stage SaaS startup triple their signups with a content-led growth strategy. Built SEO-optimized blog, launched on Product Hunt, and created viral Twitter threads.',
  'portfolio',
  ARRAY['#SaaSGrowth', '#ContentMarketing', '#ProductLaunch'],
  'Acme Analytics (Stealth)',
  'SaaS - Data Analytics',
  '2 months',
  'MRR Growth',
  '340%',
  'Organic Signups',
  '+1,247',
  'Product Hunt Rank',
  '#2 Product of Day'
);
*/

-- ==============================================
-- DONE!
-- ==============================================
