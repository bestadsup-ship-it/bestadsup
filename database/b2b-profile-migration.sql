-- B2B Creator Marketplace Profile Migration
-- Adds creator/buyer profile fields to accounts table
-- Date: 2026-02-27

-- ==============================================
-- STEP 1: ADD B2B PROFILE FIELDS TO ACCOUNTS
-- ==============================================

-- Add B2B-specific fields to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'creator' CHECK (account_type IN ('creator', 'buyer', 'hybrid')),
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS verification_badge VARCHAR(50);

-- Set default account_type for existing accounts
UPDATE accounts
SET account_type = 'creator'
WHERE account_type IS NULL;

-- ==============================================
-- STEP 2: CREATE CREATOR_PROFILES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,

  -- Professional information
  tagline VARCHAR(255),
  specialties TEXT[], -- Array of specialties (e.g., ['Video Ads', 'Social Media', 'SEO'])
  industries_served TEXT[], -- Industries they serve
  years_experience INTEGER DEFAULT 0,

  -- Pricing and availability
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'not_accepting')),
  response_time VARCHAR(50), -- e.g., "Within 24 hours"

  -- Stats and metrics
  total_services INTEGER DEFAULT 0,
  total_sales DECIMAL(12, 2) DEFAULT 0.00,
  avg_rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,

  -- Additional credentials
  certifications TEXT[], -- Array of certifications
  is_accepting_projects BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creator_profiles_account_id ON creator_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_availability ON creator_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_rating ON creator_profiles(avg_rating DESC);

-- ==============================================
-- STEP 3: CREATE CREATOR PROFILES FOR EXISTING CREATORS
-- ==============================================

-- Insert creator profiles for all accounts with account_type = 'creator' or 'hybrid'
INSERT INTO creator_profiles (account_id)
SELECT id FROM accounts
WHERE account_type IN ('creator', 'hybrid')
AND id NOT IN (SELECT account_id FROM creator_profiles)
ON CONFLICT (account_id) DO NOTHING;

-- ==============================================
-- STEP 4: CREATE TRIGGER FOR AUTO-CREATING CREATOR PROFILES
-- ==============================================

-- Function to auto-create creator profile when account is created/updated
CREATE OR REPLACE FUNCTION create_creator_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_type IN ('creator', 'hybrid') THEN
    INSERT INTO creator_profiles (account_id)
    VALUES (NEW.id)
    ON CONFLICT (account_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on accounts table
DROP TRIGGER IF EXISTS trg_create_creator_profile ON accounts;
CREATE TRIGGER trg_create_creator_profile
AFTER INSERT OR UPDATE OF account_type ON accounts
FOR EACH ROW
EXECUTE FUNCTION create_creator_profile();

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Show sample data
SELECT
  a.id,
  a.name,
  a.email,
  a.account_type,
  a.bio,
  a.avatar_url,
  a.is_verified,
  a.verification_badge,
  cp.tagline,
  cp.hourly_rate,
  cp.avg_rating
FROM accounts a
LEFT JOIN creator_profiles cp ON cp.account_id = a.id
LIMIT 5;
