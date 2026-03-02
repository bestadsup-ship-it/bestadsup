-- Verification System for B2B Marketplace
-- Sprint 2: Core differentiator - third-party verified performance data

-- Verification Badges Table
-- Tracks which verification badges a creator has earned
CREATE TABLE IF NOT EXISTS verification_badges (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- 'ga4_verified', 'hubspot_verified', 'stripe_verified', 'manual_verified'
    badge_level VARCHAR(20) NOT NULL DEFAULT 'partial', -- 'none', 'partial', 'verified'
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional expiration for reverification
    metadata JSONB, -- Store badge-specific metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, badge_type)
);

CREATE INDEX idx_verification_badges_account_id ON verification_badges(account_id);
CREATE INDEX idx_verification_badges_type ON verification_badges(badge_type);
CREATE INDEX idx_verification_badges_level ON verification_badges(badge_level);

-- Verification Data Table
-- Stores actual verified metrics from third-party APIs
CREATE TABLE IF NOT EXISTS verification_data (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    data_source VARCHAR(50) NOT NULL, -- 'ga4', 'hubspot', 'stripe', 'manual'
    metric_name VARCHAR(100) NOT NULL, -- 'monthly_revenue', 'conversion_rate', 'traffic_increase', etc.
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(50), -- 'usd', 'percent', 'count', etc.
    time_period VARCHAR(50), -- 'last_30_days', 'last_quarter', 'ytd', etc.
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verification_proof_url TEXT, -- Link to screenshot or API response
    project_id INTEGER, -- Optional: link to specific project
    metadata JSONB, -- Store additional context (client name anonymized, industry, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_data_account_id ON verification_data(account_id);
CREATE INDEX idx_verification_data_source ON verification_data(data_source);
CREATE INDEX idx_verification_data_verified ON verification_data(is_verified);
CREATE INDEX idx_verification_data_project_id ON verification_data(project_id);

-- Verification Requests Table
-- Tracks when creators request verification
CREATE TABLE IF NOT EXISTS verification_requests (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'ga4', 'hubspot', 'stripe', 'manual'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected'
    request_data JSONB, -- Store submission data (API credentials, screenshots, etc.)
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES accounts(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_requests_account_id ON verification_requests(account_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_type ON verification_requests(request_type);

-- Third-Party Connections Table
-- Stores OAuth tokens and connection status for third-party services
CREATE TABLE IF NOT EXISTS third_party_connections (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL, -- 'google_analytics', 'hubspot', 'stripe'
    connection_status VARCHAR(20) NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'expired', 'error'
    access_token_encrypted TEXT, -- Encrypted OAuth access token
    refresh_token_encrypted TEXT, -- Encrypted OAuth refresh token
    token_expires_at TIMESTAMP,
    scopes TEXT[], -- Array of granted scopes
    connected_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    metadata JSONB, -- Store account IDs, property IDs, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, service_name)
);

CREATE INDEX idx_third_party_connections_account_id ON third_party_connections(account_id);
CREATE INDEX idx_third_party_connections_service ON third_party_connections(service_name);
CREATE INDEX idx_third_party_connections_status ON third_party_connections(connection_status);

-- Add verification fields to accounts table if they don't exist
-- These are aggregated/denormalized fields for quick access
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'none', -- 'none', 'partial', 'verified'
ADD COLUMN IF NOT EXISTS has_verified_results BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0; -- 0-100 score based on number/quality of verifications

-- Create a function to update verification level
CREATE OR REPLACE FUNCTION update_account_verification_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the account's verification level based on their badges
    UPDATE accounts
    SET
        verification_level = CASE
            WHEN (SELECT COUNT(*) FROM verification_badges WHERE account_id = NEW.account_id AND badge_level = 'verified') >= 2 THEN 'verified'
            WHEN (SELECT COUNT(*) FROM verification_badges WHERE account_id = NEW.account_id AND badge_level IN ('verified', 'partial')) >= 1 THEN 'partial'
            ELSE 'none'
        END,
        has_verified_results = (SELECT COUNT(*) FROM verification_data WHERE account_id = NEW.account_id AND is_verified = true) > 0,
        verification_score = LEAST(100, (
            (SELECT COUNT(*) FROM verification_badges WHERE account_id = NEW.account_id AND badge_level = 'verified') * 30 +
            (SELECT COUNT(*) FROM verification_badges WHERE account_id = NEW.account_id AND badge_level = 'partial') * 15 +
            (SELECT COUNT(*) FROM verification_data WHERE account_id = NEW.account_id AND is_verified = true) * 5
        ))
    WHERE id = NEW.account_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update verification levels
DROP TRIGGER IF EXISTS trigger_update_verification_level_on_badge ON verification_badges;
CREATE TRIGGER trigger_update_verification_level_on_badge
    AFTER INSERT OR UPDATE OR DELETE ON verification_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_account_verification_level();

DROP TRIGGER IF EXISTS trigger_update_verification_level_on_data ON verification_data;
CREATE TRIGGER trigger_update_verification_level_on_data
    AFTER INSERT OR UPDATE OR DELETE ON verification_data
    FOR EACH ROW
    EXECUTE FUNCTION update_account_verification_level();

-- Insert some example badge types for reference
COMMENT ON TABLE verification_badges IS 'Tracks verification badges earned by creators. Badge types: ga4_verified (Google Analytics), hubspot_verified (HubSpot CRM), stripe_verified (Stripe revenue), manual_verified (Manual review by platform)';
COMMENT ON TABLE verification_data IS 'Stores actual verified performance metrics from third-party APIs. Examples: monthly_revenue ($50000, Stripe), conversion_rate (3.5%, GA4), lead_volume (250, HubSpot)';
COMMENT ON TABLE verification_requests IS 'Tracks verification requests submitted by creators. Supports both automated (OAuth) and manual (screenshot upload) verification flows';
COMMENT ON TABLE third_party_connections IS 'Manages OAuth connections to third-party services. Tokens are encrypted at rest. Supports Google Analytics, HubSpot, and Stripe initially';
