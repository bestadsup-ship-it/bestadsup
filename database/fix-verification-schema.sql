-- Fix Verification System Schema
-- Adds missing columns that backend expects

-- ============================================================================
-- ADD MISSING COLUMNS TO verification_data
-- ============================================================================

-- Add metric_unit column (e.g., "visitors", "USD", "leads")
ALTER TABLE verification_data
ADD COLUMN IF NOT EXISTS metric_unit VARCHAR(50);

-- Add time_period column (e.g., "January 2024", "Q1 2024", "30 days")
ALTER TABLE verification_data
ADD COLUMN IF NOT EXISTS time_period VARCHAR(50);

COMMENT ON COLUMN verification_data.metric_unit IS 'Unit of measurement (e.g., visitors, USD, leads, %)';
COMMENT ON COLUMN verification_data.time_period IS 'Time period for the metric (e.g., January 2024, Q1 2024)';

-- ============================================================================
-- ADD MISSING COLUMNS TO verification_badges
-- ============================================================================

-- Add badge_level column (was named 'level' in original migration)
-- Check if 'level' exists and hasn't been renamed yet
DO $$
BEGIN
    -- If 'level' column exists, rename it to 'badge_level'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'verification_badges' AND column_name = 'level'
    ) THEN
        ALTER TABLE verification_badges RENAME COLUMN level TO badge_level;
    END IF;

    -- If neither exists, create badge_level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'verification_badges' AND column_name = 'badge_level'
    ) THEN
        ALTER TABLE verification_badges
        ADD COLUMN badge_level VARCHAR(20) DEFAULT 'standard';
    END IF;
END$$;

COMMENT ON COLUMN verification_badges.badge_level IS 'Badge tier: standard, gold, platinum';

-- ============================================================================
-- ADD MISSING COLUMNS TO verification_requests
-- ============================================================================

-- Add request_data column for storing request details as JSONB
ALTER TABLE verification_requests
ADD COLUMN IF NOT EXISTS request_data JSONB;

-- Add reviewer_notes column (was named 'admin_notes')
DO $$
BEGIN
    -- If 'admin_notes' exists and 'reviewer_notes' doesn't, create reviewer_notes as alias
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'verification_requests' AND column_name = 'admin_notes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'verification_requests' AND column_name = 'reviewer_notes'
    ) THEN
        -- Keep admin_notes, add reviewer_notes as well for compatibility
        ALTER TABLE verification_requests
        ADD COLUMN reviewer_notes TEXT;

        -- Copy existing data
        UPDATE verification_requests SET reviewer_notes = admin_notes WHERE admin_notes IS NOT NULL;
    END IF;

    -- If reviewer_notes doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'verification_requests' AND column_name = 'reviewer_notes'
    ) THEN
        ALTER TABLE verification_requests
        ADD COLUMN reviewer_notes TEXT;
    END IF;
END$$;

COMMENT ON COLUMN verification_requests.request_data IS 'Request details stored as JSONB';
COMMENT ON COLUMN verification_requests.reviewer_notes IS 'Admin/reviewer notes on the request';

-- ============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_verification_data_metric_unit
ON verification_data(metric_unit);

CREATE INDEX IF NOT EXISTS idx_verification_data_time_period
ON verification_data(time_period);

CREATE INDEX IF NOT EXISTS idx_verification_badges_badge_level
ON verification_badges(badge_level);

CREATE INDEX IF NOT EXISTS idx_verification_requests_request_data
ON verification_requests USING gin(request_data);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Verification schema fix completed successfully!' as status;
