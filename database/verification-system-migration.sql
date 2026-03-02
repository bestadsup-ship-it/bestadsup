-- Verification System Migration
-- Creates tables for third-party verification of marketing results
-- Supports Google Analytics 4, HubSpot, Stripe, and future integrations

-- ============================================================================
-- VERIFICATION CONNECTIONS
-- ============================================================================
-- Stores OAuth connections to third-party analytics platforms
CREATE TABLE IF NOT EXISTS verification_connections (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Connection details
    provider VARCHAR(50) NOT NULL, -- 'google_analytics_4', 'hubspot', 'stripe', 'mixpanel'
    provider_account_id VARCHAR(255), -- Their user/account ID in the provider system

    -- OAuth tokens (encrypted)
    access_token TEXT, -- Encrypted OAuth access token
    refresh_token TEXT, -- Encrypted OAuth refresh token
    token_expires_at TIMESTAMP,

    -- Connection metadata
    scopes TEXT[], -- Permissions granted
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(50) DEFAULT 'active', -- active, expired, revoked, error
    error_message TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(account_id, provider) -- One connection per provider per account
);

CREATE INDEX idx_verification_connections_account ON verification_connections(account_id);
CREATE INDEX idx_verification_connections_provider ON verification_connections(provider);
CREATE INDEX idx_verification_connections_status ON verification_connections(connection_status);

-- ============================================================================
-- VERIFICATION DATA
-- ============================================================================
-- Stores verified metrics extracted from third-party platforms
CREATE TABLE IF NOT EXISTS verification_data (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES verification_connections(id) ON DELETE SET NULL,
    project_id INTEGER, -- NULL for portfolio metrics, can reference products or other project entities

    -- Data source
    data_source VARCHAR(50) NOT NULL, -- 'google_analytics_4', 'hubspot', 'stripe'
    metric_type VARCHAR(100) NOT NULL, -- 'traffic', 'leads', 'conversions', 'revenue', 'mrr', 'churn'

    -- Metric details
    metric_name VARCHAR(255), -- e.g., "Organic Traffic", "New Leads", "MRR"
    metric_value NUMERIC(15, 2), -- The verified value
    metric_change_percent NUMERIC(6, 2), -- % change (e.g., +127.5 for "+127%")
    comparison_period VARCHAR(50), -- 'month_over_month', 'year_over_year', 'before_after'

    -- Time range
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,

    -- Verification status
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verification_method VARCHAR(50), -- 'api_pull', 'manual_review', 'screenshot'

    -- Raw data (for audit trail)
    api_response_data JSONB, -- Store raw API response for transparency

    -- Display preferences
    is_public BOOLEAN DEFAULT false, -- Creator chooses to show on profile
    display_on_profile BOOLEAN DEFAULT false,
    display_on_portfolio_post UUID REFERENCES posts(id), -- Link to specific post

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_data_account ON verification_data(account_id);
CREATE INDEX idx_verification_data_project ON verification_data(project_id);
CREATE INDEX idx_verification_data_source ON verification_data(data_source);
CREATE INDEX idx_verification_data_metric_type ON verification_data(metric_type);
CREATE INDEX idx_verification_data_verified ON verification_data(is_verified);
CREATE INDEX idx_verification_data_public ON verification_data(is_public);

-- ============================================================================
-- VERIFICATION BADGES
-- ============================================================================
-- Stores verification badge status for creators
CREATE TABLE IF NOT EXISTS verification_badges (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Badge type
    badge_type VARCHAR(50) NOT NULL, -- 'verified_results', 'verified_identity', 'top_performer'

    -- Badge status
    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- NULL = doesn't expire

    -- Verification criteria met
    criteria_met JSONB, -- Store why badge was granted
    -- Example: {"verified_metrics_count": 5, "avg_project_rating": 4.8}

    -- Badge level (for future tiering)
    level VARCHAR(20) DEFAULT 'standard', -- 'standard', 'gold', 'platinum'

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(account_id, badge_type)
);

CREATE INDEX idx_verification_badges_account ON verification_badges(account_id);
CREATE INDEX idx_verification_badges_active ON verification_badges(is_active);
CREATE INDEX idx_verification_badges_type ON verification_badges(badge_type);

-- ============================================================================
-- VERIFICATION REQUESTS
-- ============================================================================
-- Track manual verification requests (for edge cases)
CREATE TABLE IF NOT EXISTS verification_requests (
    id SERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Request details
    request_type VARCHAR(50) NOT NULL, -- 'portfolio_metric', 'identity', 'business'
    metric_claim TEXT, -- What they're claiming (e.g., "+150% MRR growth")

    -- Evidence uploaded
    evidence_urls TEXT[], -- Screenshots, documents
    evidence_description TEXT,

    -- Review status
    status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, rejected
    reviewed_by UUID REFERENCES accounts(id), -- Admin who reviewed
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,

    -- Admin notes
    admin_notes TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_requests_account ON verification_requests(account_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_created ON verification_requests(created_at);

-- ============================================================================
-- VERIFICATION SYNC LOG
-- ============================================================================
-- Track sync operations for debugging and monitoring
CREATE TABLE IF NOT EXISTS verification_sync_log (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL REFERENCES verification_connections(id) ON DELETE CASCADE,

    -- Sync details
    sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP,
    sync_status VARCHAR(50), -- 'success', 'partial', 'failed'

    -- Results
    records_fetched INTEGER DEFAULT 0,
    records_saved INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,

    -- Error details
    error_message TEXT,
    error_details JSONB,

    -- API usage tracking
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_hit BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_sync_log_connection ON verification_sync_log(connection_id);
CREATE INDEX idx_verification_sync_log_status ON verification_sync_log(sync_status);
CREATE INDEX idx_verification_sync_log_created ON verification_sync_log(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verification_connections_updated_at
    BEFORE UPDATE ON verification_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

CREATE TRIGGER verification_data_updated_at
    BEFORE UPDATE ON verification_data
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

CREATE TRIGGER verification_badges_updated_at
    BEFORE UPDATE ON verification_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

CREATE TRIGGER verification_requests_updated_at
    BEFORE UPDATE ON verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_updated_at();

-- ============================================================================
-- VERIFICATION BADGE AUTO-GRANT FUNCTION
-- ============================================================================
-- Automatically grant "verified_results" badge when criteria met
CREATE OR REPLACE FUNCTION auto_grant_verified_results_badge()
RETURNS TRIGGER AS $$
DECLARE
    verified_count INTEGER;
BEGIN
    -- Count verified metrics for this account
    SELECT COUNT(*) INTO verified_count
    FROM verification_data
    WHERE account_id = NEW.account_id
      AND is_verified = true;

    -- Grant badge if >= 3 verified metrics and doesn't already have it
    IF verified_count >= 3 THEN
        INSERT INTO verification_badges (account_id, badge_type, criteria_met)
        VALUES (
            NEW.account_id,
            'verified_results',
            jsonb_build_object('verified_metrics_count', verified_count)
        )
        ON CONFLICT (account_id, badge_type)
        DO UPDATE SET
            criteria_met = jsonb_build_object('verified_metrics_count', verified_count),
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_grant_badge_on_verification
    AFTER INSERT OR UPDATE ON verification_data
    FOR EACH ROW
    WHEN (NEW.is_verified = true)
    EXECUTE FUNCTION auto_grant_verified_results_badge();

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Creator verification summary
CREATE OR REPLACE VIEW creator_verification_summary AS
SELECT
    a.id AS account_id,
    a.email,
    a.name,
    -- Connection status
    COUNT(DISTINCT vc.id) FILTER (WHERE vc.is_active = true) AS active_connections,
    array_agg(DISTINCT vc.provider) FILTER (WHERE vc.is_active = true) AS connected_providers,

    -- Verified metrics
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.is_verified = true) AS verified_metrics_count,
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.is_verified = true AND vd.is_public = true) AS public_verified_metrics,

    -- Badges
    COUNT(DISTINCT vb.id) FILTER (WHERE vb.is_active = true) AS active_badges_count,
    array_agg(DISTINCT vb.badge_type) FILTER (WHERE vb.is_active = true) AS badge_types,

    -- Overall status
    CASE
        WHEN COUNT(DISTINCT vd.id) FILTER (WHERE vd.is_verified = true) >= 3 THEN 'verified'
        WHEN COUNT(DISTINCT vc.id) FILTER (WHERE vc.is_active = true) > 0 THEN 'connected'
        ELSE 'unverified'
    END AS verification_status

FROM accounts a
LEFT JOIN verification_connections vc ON a.id = vc.account_id
LEFT JOIN verification_data vd ON a.id = vd.account_id
LEFT JOIN verification_badges vb ON a.id = vb.account_id
WHERE a.account_type = 'creator'
GROUP BY a.id, a.email, a.name;

-- View: Recent verification activity
CREATE OR REPLACE VIEW recent_verification_activity AS
SELECT
    vd.id,
    vd.account_id,
    a.name AS creator_name,
    vd.data_source,
    vd.metric_type,
    vd.metric_name,
    vd.metric_value,
    vd.metric_change_percent,
    vd.is_verified,
    vd.verified_at,
    vd.created_at
FROM verification_data vd
JOIN accounts a ON vd.account_id = a.id
WHERE vd.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY vd.created_at DESC;

-- ============================================================================
-- SAMPLE DATA (for development only - comment out for production)
-- ============================================================================

-- Add verification connection status to accounts table (if not exists)
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS has_verified_results BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'none'; -- none, basic, verified, pro

-- Function to update account verification status
CREATE OR REPLACE FUNCTION update_account_verification_status()
RETURNS TRIGGER AS $$
DECLARE
    verified_count INTEGER;
    connection_count INTEGER;
BEGIN
    -- Count verified metrics
    SELECT COUNT(*) INTO verified_count
    FROM verification_data
    WHERE account_id = NEW.account_id AND is_verified = true;

    -- Count active connections
    SELECT COUNT(*) INTO connection_count
    FROM verification_connections
    WHERE account_id = NEW.account_id AND is_active = true;

    -- Update account verification status
    UPDATE accounts
    SET
        has_verified_results = (verified_count > 0),
        verification_level = CASE
            WHEN verified_count >= 5 THEN 'pro'
            WHEN verified_count >= 3 THEN 'verified'
            WHEN connection_count > 0 THEN 'basic'
            ELSE 'none'
        END
    WHERE id = NEW.account_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_verification_on_data_change
    AFTER INSERT OR UPDATE OR DELETE ON verification_data
    FOR EACH ROW
    EXECUTE FUNCTION update_account_verification_status();

CREATE TRIGGER update_account_verification_on_connection_change
    AFTER INSERT OR UPDATE OR DELETE ON verification_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_account_verification_status();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE verification_connections IS 'OAuth connections to third-party analytics platforms (GA4, HubSpot, Stripe)';
COMMENT ON TABLE verification_data IS 'Verified metrics extracted from connected platforms';
COMMENT ON TABLE verification_badges IS 'Verification badges displayed on creator profiles';
COMMENT ON TABLE verification_requests IS 'Manual verification requests for edge cases';
COMMENT ON TABLE verification_sync_log IS 'Audit log of sync operations';
