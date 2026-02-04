-- B2B Ad Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_email ON accounts(email);

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_account_id ON properties(account_id);

-- Ad Units table
CREATE TABLE ad_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_units_property_id ON ad_units(property_id);
CREATE INDEX idx_ad_units_account_id ON ad_units(account_id);
CREATE INDEX idx_ad_units_id_account_id ON ad_units(id, account_id);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cpm INTEGER NOT NULL, -- CPM in cents
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- Creatives table
CREATE TABLE creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    creative_url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    click_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX idx_creatives_account_id ON creatives(account_id);

-- Ad Unit Campaigns (mapping table)
CREATE TABLE ad_unit_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_unit_id UUID NOT NULL REFERENCES ad_units(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ad_unit_id, campaign_id)
);

CREATE INDEX idx_ad_unit_campaigns_ad_unit_id ON ad_unit_campaigns(ad_unit_id);
CREATE INDEX idx_ad_unit_campaigns_campaign_id ON ad_unit_campaigns(campaign_id);
CREATE INDEX idx_ad_unit_campaigns_account_id ON ad_unit_campaigns(account_id);
CREATE INDEX idx_ad_unit_campaigns_priority ON ad_unit_campaigns(ad_unit_id, priority DESC);

-- Events table (for analytics)
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'click')),
    ad_unit_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    creative_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partition by time for better performance
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_account_id ON events(account_id);
CREATE INDEX idx_events_ad_unit_id ON events(ad_unit_id);
CREATE INDEX idx_events_campaign_id ON events(campaign_id);
CREATE INDEX idx_events_type_timestamp ON events(event_type, timestamp DESC);

-- Aggregated metrics table (for fast dashboard queries)
CREATE TABLE metrics_hourly (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ad_unit_id UUID,
    campaign_id UUID,
    hour_timestamp TIMESTAMP NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    requests INTEGER DEFAULT 0,
    revenue_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, ad_unit_id, campaign_id, hour_timestamp)
);

CREATE INDEX idx_metrics_hourly_account_id ON metrics_hourly(account_id, hour_timestamp DESC);
CREATE INDEX idx_metrics_hourly_ad_unit_id ON metrics_hourly(ad_unit_id, hour_timestamp DESC);
CREATE INDEX idx_metrics_hourly_campaign_id ON metrics_hourly(campaign_id, hour_timestamp DESC);

-- Request log for fill rate calculation (lightweight)
CREATE TABLE ad_requests (
    id BIGSERIAL PRIMARY KEY,
    ad_unit_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    filled BOOLEAN NOT NULL,
    no_fill_reason VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ad_requests_timestamp ON ad_requests(timestamp DESC);
CREATE INDEX idx_ad_requests_ad_unit_id ON ad_requests(ad_unit_id, timestamp DESC);
CREATE INDEX idx_ad_requests_account_id ON ad_requests(account_id, timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_units_updated_at BEFORE UPDATE ON ad_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON creatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_hourly_updated_at BEFORE UPDATE ON metrics_hourly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
