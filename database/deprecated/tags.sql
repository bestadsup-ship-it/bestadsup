-- Tags system for content discovery and recommendations

-- Tags table: stores unique tags/hashtags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  normalized_name VARCHAR(100) NOT NULL UNIQUE, -- lowercase, no special chars for matching
  use_count INTEGER DEFAULT 0, -- track popularity
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast tag lookup
CREATE INDEX IF NOT EXISTS idx_tags_normalized ON tags(normalized_name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags(use_count DESC);

-- Post tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- Product tags junction table (for shop items)
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, tag_id)
);

-- Indexes for product tags
CREATE INDEX IF NOT EXISTS idx_product_tags_product ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag_id);

-- User interests table (tracks which tags users engage with)
CREATE TABLE IF NOT EXISTS user_tag_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  interest_score DECIMAL(10, 2) DEFAULT 0, -- calculated from interactions
  last_interaction TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, tag_id)
);

-- Index for user interest queries
CREATE INDEX IF NOT EXISTS idx_user_interests_account ON user_tag_interests(account_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_score ON user_tag_interests(interest_score DESC);

-- Function to normalize tag names
CREATE OR REPLACE FUNCTION normalize_tag_name(tag_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, remove #, trim whitespace
  RETURN LOWER(TRIM(REGEXP_REPLACE(tag_name, '^#', '')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Seed some common B2B tags
INSERT INTO tags (name, normalized_name, use_count) VALUES
  ('#B2B', 'b2b', 0),
  ('#Marketing', 'marketing', 0),
  ('#Sales', 'sales', 0),
  ('#SmallBusiness', 'smallbusiness', 0),
  ('#Entrepreneur', 'entrepreneur', 0),
  ('#Business', 'business', 0),
  ('#Advertising', 'advertising', 0),
  ('#DigitalMarketing', 'digitalmarketing', 0),
  ('#SocialMedia', 'socialmedia', 0),
  ('#ContentMarketing', 'contentmarketing', 0),
  ('#GrowthHacking', 'growthhacking', 0),
  ('#StartUp', 'startup', 0),
  ('#Ecommerce', 'ecommerce', 0),
  ('#Tech', 'tech', 0),
  ('#Innovation', 'innovation', 0)
ON CONFLICT (normalized_name) DO NOTHING;
