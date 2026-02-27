-- User Types Migration
-- Differentiate Creator vs Buyer accounts
-- Date: 2026-02-27

-- ==============================================
-- STEP 1: EXTEND ACCOUNTS TABLE FOR USER TYPES
-- ==============================================

DO $$
BEGIN
  -- Core user type
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'creator'
    CHECK (account_type IN ('creator', 'buyer', 'hybrid'));

  -- Verification & trust
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_badge VARCHAR(50); -- 'verified', 'pro', 'expert'
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

  -- Profile completeness
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1; -- Track onboarding progress

  -- General profile fields (if not already present)
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS website_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS location VARCHAR(255);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

  -- Social links
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS instagram_url TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

  -- Stats (generic for both types)
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_followers INTEGER DEFAULT 0;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_following INTEGER DEFAULT 0;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_posts INTEGER DEFAULT 0;

  RAISE NOTICE 'Core account fields added';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Some columns already exist, continuing...';
END $$;

-- ==============================================
-- STEP 2: CREATOR-SPECIFIC PROFILE
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Professional info
  tagline VARCHAR(255), -- e.g., "B2B SaaS Marketing Specialist"
  specialties TEXT[], -- e.g., ['Content Marketing', 'SEO', 'Paid Ads']
  industries_served TEXT[], -- e.g., ['SaaS', 'FinTech', 'Healthcare']
  years_experience INTEGER,

  -- Service info
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  availability_status VARCHAR(50) DEFAULT 'available' CHECK (availability_status IN (
    'available', 'busy', 'not_accepting'
  )),
  response_time VARCHAR(50), -- e.g., 'within 24 hours'

  -- Portfolio stats
  total_services INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  repeat_client_rate DECIMAL(5,2) DEFAULT 0.0, -- percentage

  -- Achievements/certifications
  certifications TEXT[], -- e.g., ['Google Ads Certified', 'HubSpot Inbound']
  awards TEXT[],

  -- Platform stats
  profile_views INTEGER DEFAULT 0,
  service_views INTEGER DEFAULT 0,

  -- Settings
  is_accepting_projects BOOLEAN DEFAULT TRUE,
  min_project_size DECIMAL(10,2), -- Minimum budget
  preferred_project_length VARCHAR(50), -- 'short_term', 'long_term', 'both'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 3: BUYER-SPECIFIC PROFILE
-- ==============================================

CREATE TABLE IF NOT EXISTS buyer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Company info
  company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'enterprise'
  company_industry VARCHAR(100),
  company_website TEXT,
  company_description TEXT,

  -- Buying preferences
  typical_project_budget VARCHAR(50), -- '<$1K', '$1K-$5K', '$5K-$10K', '$10K+'
  preferred_communication VARCHAR(50)[], -- ['email', 'slack', 'zoom']
  timezone VARCHAR(100),

  -- Purchase history
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  total_reviews_given INTEGER DEFAULT 0,

  -- Verification
  payment_method_verified BOOLEAN DEFAULT FALSE,
  company_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 4: CREATOR PORTFOLIO SETTINGS
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Visibility settings
  show_earnings BOOLEAN DEFAULT FALSE,
  show_reviews BOOLEAN DEFAULT TRUE,
  show_response_time BOOLEAN DEFAULT TRUE,

  -- Notification preferences
  notify_new_order BOOLEAN DEFAULT TRUE,
  notify_new_message BOOLEAN DEFAULT TRUE,
  notify_new_review BOOLEAN DEFAULT TRUE,
  notify_new_follower BOOLEAN DEFAULT TRUE,

  -- Email preferences
  email_marketing BOOLEAN DEFAULT TRUE,
  email_order_updates BOOLEAN DEFAULT TRUE,
  email_weekly_summary BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 5: BUYER PREFERENCES
-- ==============================================

CREATE TABLE IF NOT EXISTS buyer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Discovery preferences
  favorite_categories TEXT[],
  saved_creators UUID[], -- Array of creator account IDs

  -- Notification preferences
  notify_order_status BOOLEAN DEFAULT TRUE,
  notify_new_message BOOLEAN DEFAULT TRUE,
  notify_favorites_activity BOOLEAN DEFAULT TRUE,

  -- Email preferences
  email_order_updates BOOLEAN DEFAULT TRUE,
  email_recommendations BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STEP 6: CREATE INDEXES
-- ==============================================

-- Accounts indexes (new)
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_verified ON accounts(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_accounts_profile_completed ON accounts(profile_completed) WHERE profile_completed = TRUE;
CREATE INDEX IF NOT EXISTS idx_accounts_location ON accounts(location);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_account_id ON creator_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_availability ON creator_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_rating ON creator_profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_specialties ON creator_profiles USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_industries ON creator_profiles USING GIN(industries_served);

-- Buyer profiles indexes
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_account_id ON buyer_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_company_size ON buyer_profiles(company_size);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_verified ON buyer_profiles(company_verified) WHERE company_verified = TRUE;

-- ==============================================
-- STEP 7: CREATE TRIGGERS
-- ==============================================

-- Auto-create creator or buyer profile based on account_type
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_type = 'creator' OR NEW.account_type = 'hybrid' THEN
    INSERT INTO creator_profiles (account_id) VALUES (NEW.id)
    ON CONFLICT (account_id) DO NOTHING;

    INSERT INTO creator_settings (account_id) VALUES (NEW.id)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  IF NEW.account_type = 'buyer' OR NEW.account_type = 'hybrid' THEN
    INSERT INTO buyer_profiles (account_id) VALUES (NEW.id)
    ON CONFLICT (account_id) DO NOTHING;

    INSERT INTO buyer_settings (account_id) VALUES (NEW.id)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_profile ON accounts;
CREATE TRIGGER auto_create_profile
    AFTER INSERT OR UPDATE OF account_type ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Update profile completed status
CREATE OR REPLACE FUNCTION check_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  is_complete BOOLEAN := FALSE;
BEGIN
  -- Check if essential profile fields are filled
  IF NEW.bio IS NOT NULL
    AND NEW.avatar_url IS NOT NULL
    AND NEW.company_name IS NOT NULL
    AND NEW.location IS NOT NULL
  THEN
    is_complete := TRUE;

    -- Additional checks for creators
    IF NEW.account_type IN ('creator', 'hybrid') THEN
      IF EXISTS (
        SELECT 1 FROM creator_profiles
        WHERE account_id = NEW.id
          AND tagline IS NOT NULL
          AND specialties IS NOT NULL
          AND array_length(specialties, 1) > 0
      ) THEN
        is_complete := TRUE;
      ELSE
        is_complete := FALSE;
      END IF;
    END IF;
  END IF;

  UPDATE accounts
  SET profile_completed = is_complete
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_completion ON accounts;
CREATE TRIGGER update_profile_completion
    AFTER UPDATE ON accounts
    FOR EACH ROW
    WHEN (NEW.bio IS DISTINCT FROM OLD.bio
      OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
      OR NEW.company_name IS DISTINCT FROM OLD.company_name
      OR NEW.location IS DISTINCT FROM OLD.location)
    EXECUTE FUNCTION check_profile_completion();

-- Update creator stats
CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update service count
  UPDATE creator_profiles cp
  SET total_services = (
    SELECT COUNT(*) FROM products
    WHERE creator_id = NEW.creator_id AND is_active = TRUE
  )
  WHERE cp.account_id = NEW.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_creator_services ON products;
CREATE TRIGGER sync_creator_services
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_creator_stats();

-- ==============================================
-- STEP 8: ADD HELPER FUNCTIONS
-- ==============================================

-- Function to get creator card data
CREATE OR REPLACE FUNCTION get_creator_card(creator_account_id UUID)
RETURNS TABLE (
  account_id UUID,
  name VARCHAR(255),
  username VARCHAR(50),
  avatar_url TEXT,
  tagline VARCHAR(255),
  specialties TEXT[],
  avg_rating DECIMAL(3,2),
  total_reviews INTEGER,
  total_sales INTEGER,
  response_time VARCHAR(50),
  is_verified BOOLEAN,
  verification_badge VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.username,
    a.avatar_url,
    cp.tagline,
    cp.specialties,
    cp.avg_rating,
    cp.total_reviews,
    cp.total_sales,
    cp.response_time,
    a.is_verified,
    a.verification_badge
  FROM accounts a
  LEFT JOIN creator_profiles cp ON cp.account_id = a.id
  WHERE a.id = creator_account_id AND a.account_type IN ('creator', 'hybrid');
END;
$$ LANGUAGE plpgsql;

-- Function to check if profile is complete
CREATE OR REPLACE FUNCTION is_profile_complete(user_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  complete BOOLEAN := FALSE;
  user_type VARCHAR(50);
BEGIN
  SELECT account_type INTO user_type FROM accounts WHERE id = user_account_id;

  -- Check basic profile
  SELECT COUNT(*) = 5 INTO complete
  FROM accounts
  WHERE id = user_account_id
    AND bio IS NOT NULL
    AND avatar_url IS NOT NULL
    AND company_name IS NOT NULL
    AND location IS NOT NULL
    AND job_title IS NOT NULL;

  -- Additional check for creators
  IF user_type IN ('creator', 'hybrid') AND complete THEN
    SELECT COUNT(*) = 3 INTO complete
    FROM creator_profiles
    WHERE account_id = user_account_id
      AND tagline IS NOT NULL
      AND specialties IS NOT NULL
      AND array_length(specialties, 1) >= 3;
  END IF;

  RETURN complete;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- STEP 9: MIGRATE EXISTING ACCOUNTS
-- ==============================================

-- Set default account_type for existing accounts
UPDATE accounts
SET account_type = 'creator'
WHERE account_type IS NULL;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE 'User Types migration completed successfully!';
  RAISE NOTICE 'Extended accounts table with account_type field';
  RAISE NOTICE 'Created tables: creator_profiles, buyer_profiles, creator_settings, buyer_settings';
  RAISE NOTICE 'Added helper functions for creator cards and profile completion';
  RAISE NOTICE 'All existing accounts set to creator type';
END $$;
