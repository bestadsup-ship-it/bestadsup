-- Portfolio Posts Migration
-- Add portfolio and case study features to posts
-- Date: 2026-02-27

-- ==============================================
-- STEP 1: EXTEND POSTS TABLE FOR PORTFOLIO FEATURES
-- ==============================================

-- Add portfolio-specific columns to posts table
DO $$
BEGIN
  -- Post type
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'regular'
    CHECK (post_type IN ('regular', 'portfolio', 'case_study', 'insight', 'achievement'));

  -- Portfolio/Case Study fields
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS project_duration VARCHAR(50); -- e.g., '3 months', '6 weeks'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS project_url TEXT;

  -- Metrics/Results (for case studies)
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_1_label VARCHAR(100); -- e.g., 'Leads Generated'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_1_value VARCHAR(50);  -- e.g., '+127%'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_1_change VARCHAR(20); -- 'increase', 'decrease', 'neutral'

  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_2_label VARCHAR(100); -- e.g., 'Conversion Rate'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_2_value VARCHAR(50);  -- e.g., '3.2x'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_2_change VARCHAR(20);

  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_3_label VARCHAR(100); -- e.g., 'ROI'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_3_value VARCHAR(50);  -- e.g., '450%'
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_3_change VARCHAR(20);

  -- Skills/Tags used in project
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS skills_used TEXT[]; -- e.g., ['SEO', 'Content Marketing', 'Google Ads']

  -- Linked service (if promoting a service)
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_service_id UUID REFERENCES products(id) ON DELETE SET NULL;

  -- Featured status (for portfolio highlights)
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP;

  -- Engagement boost (promoted posts)
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS promotion_budget DECIMAL(10,2);
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS promotion_start TIMESTAMP;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS promotion_end TIMESTAMP;

  RAISE NOTICE 'Portfolio columns added to posts table';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Some columns already exist, skipping...';
END $$;

-- ==============================================
-- STEP 2: CREATE POST ATTACHMENTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Attachment details
  attachment_type VARCHAR(50) NOT NULL CHECK (attachment_type IN (
    'image', 'video', 'document', 'link', 'embed'
  )),
  url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  title VARCHAR(255),
  description TEXT,
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos, in seconds

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 3: CREATE PROJECT TESTIMONIALS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS project_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Testimonial content
  client_name VARCHAR(255) NOT NULL,
  client_role VARCHAR(255), -- e.g., 'CEO at TechCorp'
  client_company VARCHAR(255),
  client_avatar_url TEXT,
  testimonial_text TEXT NOT NULL,

  -- Ratings
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 4: CREATE POST METRICS TABLE (Detailed Tracking)
-- ==============================================

CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Engagement metrics
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  -- Profile visits from post
  profile_visits INTEGER DEFAULT 0,

  -- Service bookings from post (if linked to service)
  service_views INTEGER DEFAULT 0,
  service_bookings INTEGER DEFAULT 0,

  -- Time-based metrics
  avg_view_duration INTEGER, -- seconds
  completion_rate DECIMAL(5,2), -- percentage who viewed entire post

  -- Date tracking
  metrics_date DATE NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(post_id, metrics_date)
);

-- ==============================================
-- STEP 5: CREATE PORTFOLIO COLLECTIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS portfolio_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Collection details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL,
  cover_image_url TEXT,

  -- Settings
  is_public BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  -- Stats
  post_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, slug)
);

CREATE TABLE IF NOT EXISTS collection_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES portfolio_collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(collection_id, post_id)
);

-- ==============================================
-- STEP 6: CREATE INDEXES
-- ==============================================

-- Posts indexes (new)
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_is_promoted ON posts(is_promoted) WHERE is_promoted = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_linked_service ON posts(linked_service_id) WHERE linked_service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_industry ON posts(industry);
CREATE INDEX IF NOT EXISTS idx_posts_skills_used ON posts USING GIN(skills_used);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_post_id ON post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON post_attachments(attachment_type);

-- Testimonials indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_post_id ON project_testimonials(post_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_account_id ON project_testimonials(account_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_verified ON project_testimonials(is_verified) WHERE is_verified = TRUE;

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_date ON post_metrics(metrics_date DESC);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_account_id ON portfolio_collections(account_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON portfolio_collections(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_collection_posts_collection ON collection_posts(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_posts_post ON collection_posts(post_id);

-- ==============================================
-- STEP 7: CREATE TRIGGERS
-- ==============================================

-- Update collection post count
CREATE OR REPLACE FUNCTION update_collection_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE portfolio_collections
    SET post_count = post_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE portfolio_collections
    SET post_count = GREATEST(0, post_count - 1)
    WHERE id = OLD.collection_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_collection_count ON collection_posts;
CREATE TRIGGER update_collection_count
    AFTER INSERT OR DELETE ON collection_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_post_count();

-- Update post engagement counts from detailed metrics
CREATE OR REPLACE FUNCTION sync_post_engagement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET
    views = COALESCE((SELECT SUM(views) FROM post_metrics WHERE post_id = NEW.post_id), 0),
    clicks = COALESCE((SELECT SUM(service_bookings) FROM post_metrics WHERE post_id = NEW.post_id), 0)
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_post_metrics ON post_metrics;
CREATE TRIGGER sync_post_metrics
    AFTER INSERT OR UPDATE ON post_metrics
    FOR EACH ROW
    EXECUTE FUNCTION sync_post_engagement();

-- ==============================================
-- STEP 8: ADD HELPER FUNCTIONS
-- ==============================================

-- Function to get portfolio summary for a creator
CREATE OR REPLACE FUNCTION get_creator_portfolio_stats(creator_account_id UUID)
RETURNS TABLE (
  total_projects INTEGER,
  total_clients INTEGER,
  avg_project_rating DECIMAL(3,2),
  total_testimonials INTEGER,
  industries_served TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT p.id)::INTEGER as total_projects,
    COUNT(DISTINCT p.client_name)::INTEGER as total_clients,
    AVG(pt.rating)::DECIMAL(3,2) as avg_project_rating,
    COUNT(pt.id)::INTEGER as total_testimonials,
    ARRAY_AGG(DISTINCT p.industry) FILTER (WHERE p.industry IS NOT NULL) as industries_served
  FROM posts p
  LEFT JOIN project_testimonials pt ON pt.post_id = p.id
  WHERE p.account_id = creator_account_id
    AND p.post_type IN ('portfolio', 'case_study')
    AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement score for ranking
CREATE OR REPLACE FUNCTION calculate_engagement_score(post_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  score DECIMAL(10,2);
BEGIN
  SELECT (
    (p.likes_count * 1.0) +
    (p.comments_count * 2.0) +
    (p.shares_count * 3.0) +
    (p.saves_count * 2.5) +
    (COALESCE(pm.profile_visits, 0) * 1.5) +
    (COALESCE(pm.service_bookings, 0) * 5.0)
  ) INTO score
  FROM posts p
  LEFT JOIN (
    SELECT post_id, SUM(profile_visits) as profile_visits, SUM(service_bookings) as service_bookings
    FROM post_metrics
    WHERE post_id = post_uuid
    GROUP BY post_id
  ) pm ON pm.post_id = p.id
  WHERE p.id = post_uuid;

  RETURN COALESCE(score, 0);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE 'Portfolio Posts migration completed successfully!';
  RAISE NOTICE 'Extended posts table with portfolio fields';
  RAISE NOTICE 'Created tables: post_attachments, project_testimonials, post_metrics, portfolio_collections';
  RAISE NOTICE 'Added helper functions for portfolio stats and engagement scoring';
END $$;
