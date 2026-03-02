-- Escrow Payments Migration
-- Creates tables for Stripe Connect escrow-based milestone payments
-- Supports 50% upfront, 50% on completion payment model

-- ============================================================================
-- ESCROW ACCOUNTS
-- ============================================================================
-- Stores Stripe Connect account details for creators
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Stripe Connect details
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL, -- Stripe Connect account ID (acct_xxx)
    account_type VARCHAR(50) DEFAULT 'express', -- 'express' or 'custom'

    -- Account status
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, restricted, disabled
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_url TEXT, -- Link to complete Stripe onboarding

    -- Verification
    verification_status VARCHAR(50), -- unverified, pending, verified
    verification_fields_needed TEXT[],

    -- Bank account (encrypted)
    has_bank_account BOOLEAN DEFAULT false,
    bank_last4 VARCHAR(4),
    bank_country VARCHAR(2),

    -- Metadata
    stripe_metadata JSONB,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(account_id) -- One Stripe account per user
);

CREATE INDEX idx_escrow_accounts_account ON escrow_accounts(account_id);
CREATE INDEX idx_escrow_accounts_stripe ON escrow_accounts(stripe_account_id);
CREATE INDEX idx_escrow_accounts_status ON escrow_accounts(status);

-- ============================================================================
-- ESCROW TRANSACTIONS
-- ============================================================================
-- Stores individual escrow transactions tied to project milestones
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Parties
    buyer_id INTEGER NOT NULL REFERENCES accounts(id),
    creator_id INTEGER NOT NULL REFERENCES accounts(id),

    -- Transaction details
    amount NUMERIC(10, 2) NOT NULL, -- Amount in dollars (e.g., 1000.00)
    currency VARCHAR(3) DEFAULT 'USD',
    platform_fee NUMERIC(10, 2), -- Platform commission (15%)
    stripe_fee NUMERIC(10, 2), -- Stripe processing fee (~2.9% + $0.30)
    creator_payout NUMERIC(10, 2), -- Amount creator receives after fees

    -- Escrow status
    status VARCHAR(50) DEFAULT 'pending', -- pending, held, released, refunded, disputed
    escrow_type VARCHAR(50) NOT NULL, -- 'upfront' (50%), 'completion' (50%)

    -- Stripe payment details
    stripe_payment_intent_id VARCHAR(255) UNIQUE, -- pi_xxx
    stripe_charge_id VARCHAR(255), -- ch_xxx
    stripe_transfer_id VARCHAR(255), -- tr_xxx (when released to creator)
    stripe_refund_id VARCHAR(255), -- re_xxx (if refunded)

    -- Release conditions
    release_condition_type VARCHAR(50), -- 'milestone_completed', 'project_completed', 'buyer_approved', 'auto_after_days'
    release_condition_value TEXT, -- JSON or text describing the condition
    auto_release_at TIMESTAMP, -- Auto-release date if not disputed

    -- Timeline
    held_at TIMESTAMP, -- When funds were captured
    released_at TIMESTAMP, -- When transferred to creator
    refunded_at TIMESTAMP, -- When refunded to buyer
    disputed_at TIMESTAMP, -- When dispute opened

    -- Release approval
    approved_by INTEGER REFERENCES accounts(id), -- Buyer who approved
    approved_at TIMESTAMP,

    -- Dispute info
    dispute_reason TEXT,
    dispute_resolution VARCHAR(50), -- 'buyer_wins', 'creator_wins', 'split', 'pending'

    -- Metadata
    stripe_metadata JSONB,
    internal_notes TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_transactions_project ON escrow_transactions(project_id);
CREATE INDEX idx_escrow_transactions_buyer ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_transactions_creator ON escrow_transactions(creator_id);
CREATE INDEX idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_transactions_type ON escrow_transactions(escrow_type);
CREATE INDEX idx_escrow_transactions_payment_intent ON escrow_transactions(stripe_payment_intent_id);
CREATE INDEX idx_escrow_transactions_auto_release ON escrow_transactions(auto_release_at) WHERE auto_release_at IS NOT NULL;

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================
-- Stores buyer payment methods (Stripe payment methods)
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Stripe details
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL, -- pm_xxx
    stripe_customer_id VARCHAR(255), -- cus_xxx

    -- Card/bank details (last 4 digits only)
    type VARCHAR(50) NOT NULL, -- 'card', 'bank_account', 'us_bank_account'
    brand VARCHAR(50), -- 'visa', 'mastercard', 'amex'
    last4 VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,

    -- Bank account details (if applicable)
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),

    -- Status
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,

    -- Billing address
    billing_country VARCHAR(2),
    billing_postal_code VARCHAR(20),

    -- Metadata
    stripe_metadata JSONB,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_account ON payment_methods(account_id);
CREATE INDEX idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(is_default) WHERE is_default = true;

-- ============================================================================
-- PAYOUT SCHEDULE
-- ============================================================================
-- Tracks scheduled payouts to creators
CREATE TABLE IF NOT EXISTS payout_schedule (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    escrow_account_id INTEGER NOT NULL REFERENCES escrow_accounts(id),

    -- Payout details
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, processing, paid, failed, cancelled
    scheduled_for TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,

    -- Stripe details
    stripe_payout_id VARCHAR(255), -- po_xxx
    stripe_transfer_id VARCHAR(255), -- tr_xxx

    -- Failure info
    failure_code VARCHAR(100),
    failure_message TEXT,

    -- Transactions included
    transaction_ids INTEGER[], -- Array of escrow_transaction IDs

    -- Metadata
    stripe_metadata JSONB,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payout_schedule_creator ON payout_schedule(creator_id);
CREATE INDEX idx_payout_schedule_status ON payout_schedule(status);
CREATE INDEX idx_payout_schedule_scheduled ON payout_schedule(scheduled_for);

-- ============================================================================
-- ESCROW EVENTS LOG
-- ============================================================================
-- Audit log of all escrow-related events (for compliance and debugging)
CREATE TABLE IF NOT EXISTS escrow_events_log (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES escrow_transactions(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- 'payment_initiated', 'funds_held', 'funds_released', 'refund_processed', etc.
    event_status VARCHAR(50), -- 'success', 'failed', 'pending'

    -- Actor
    triggered_by INTEGER REFERENCES accounts(id), -- Who triggered the event (buyer, creator, system, admin)
    triggered_by_system BOOLEAN DEFAULT false, -- Auto-release, scheduled job, etc.

    -- Stripe webhook
    stripe_event_id VARCHAR(255), -- evt_xxx from Stripe webhook
    stripe_event_type VARCHAR(100), -- payment_intent.succeeded, charge.refunded, etc.

    -- Data
    event_data JSONB, -- Full event payload

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escrow_events_transaction ON escrow_events_log(transaction_id);
CREATE INDEX idx_escrow_events_type ON escrow_events_log(event_type);
CREATE INDEX idx_escrow_events_stripe ON escrow_events_log(stripe_event_id);
CREATE INDEX idx_escrow_events_created ON escrow_events_log(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_escrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_accounts_updated_at
    BEFORE UPDATE ON escrow_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_updated_at();

CREATE TRIGGER escrow_transactions_updated_at
    BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_updated_at();

CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_updated_at();

CREATE TRIGGER payout_schedule_updated_at
    BEFORE UPDATE ON payout_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_updated_at();

-- ============================================================================
-- CALCULATE FEES FUNCTION
-- ============================================================================
-- Automatically calculate platform and Stripe fees
CREATE OR REPLACE FUNCTION calculate_escrow_fees()
RETURNS TRIGGER AS $$
DECLARE
    platform_fee_percent NUMERIC := 0.15; -- 15% platform commission (10% buyer + 5% creator)
    stripe_fee_percent NUMERIC := 0.029; -- Stripe 2.9%
    stripe_fixed_fee NUMERIC := 0.30; -- Stripe $0.30 per transaction
BEGIN
    -- Calculate platform fee (15% of amount)
    NEW.platform_fee := ROUND(NEW.amount * platform_fee_percent, 2);

    -- Calculate Stripe fee (2.9% + $0.30)
    NEW.stripe_fee := ROUND((NEW.amount * stripe_fee_percent) + stripe_fixed_fee, 2);

    -- Calculate creator payout (amount - all fees)
    NEW.creator_payout := NEW.amount - NEW.platform_fee - NEW.stripe_fee;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_fees_on_insert
    BEFORE INSERT ON escrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_escrow_fees();

-- ============================================================================
-- AUTO-RELEASE ESCROW FUNCTION
-- ============================================================================
-- Automatically release funds after X days if no dispute
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS void AS $$
DECLARE
    transaction RECORD;
BEGIN
    -- Find transactions eligible for auto-release
    FOR transaction IN
        SELECT id, project_id, creator_id, creator_payout
        FROM escrow_transactions
        WHERE status = 'held'
          AND auto_release_at <= CURRENT_TIMESTAMP
          AND disputed_at IS NULL
    LOOP
        -- Update status to released
        UPDATE escrow_transactions
        SET
            status = 'released',
            released_at = CURRENT_TIMESTAMP
        WHERE id = transaction.id;

        -- Log event
        INSERT INTO escrow_events_log (transaction_id, event_type, event_status, triggered_by_system, event_data)
        VALUES (
            transaction.id,
            'auto_release',
            'success',
            true,
            jsonb_build_object(
                'reason', 'auto_release_timer_expired',
                'released_amount', transaction.creator_payout
            )
        );

        -- TODO: Trigger Stripe transfer to creator's Connect account
        -- This will be handled by background job calling Stripe API
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule auto-release to run daily
-- COMMENT: Set up cron job or scheduled task to call: SELECT auto_release_escrow();

-- ============================================================================
-- ENSURE ONE DEFAULT PAYMENT METHOD
-- ============================================================================
-- When setting a payment method as default, unset others
CREATE OR REPLACE FUNCTION ensure_one_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset all other payment methods for this account
        UPDATE payment_methods
        SET is_default = false
        WHERE account_id = NEW.account_id
          AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_one_default_payment_method();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Escrow balance summary per creator
CREATE OR REPLACE VIEW creator_escrow_balance AS
SELECT
    creator_id,
    a.name AS creator_name,
    COUNT(*) AS transactions_count,
    SUM(amount) FILTER (WHERE status = 'held') AS held_balance,
    SUM(creator_payout) FILTER (WHERE status = 'released') AS total_earned,
    SUM(platform_fee) FILTER (WHERE status = 'released') AS total_fees_paid,
    MIN(held_at) AS first_transaction_at,
    MAX(released_at) AS last_payout_at
FROM escrow_transactions et
JOIN accounts a ON et.creator_id = a.id
GROUP BY creator_id, a.name;

-- View: Platform revenue from escrow
CREATE OR REPLACE VIEW platform_escrow_revenue AS
SELECT
    DATE_TRUNC('month', released_at) AS month,
    COUNT(*) AS transactions_released,
    SUM(amount) AS total_transaction_volume,
    SUM(platform_fee) AS platform_revenue,
    SUM(stripe_fee) AS stripe_costs,
    SUM(platform_fee) - SUM(stripe_fee) AS net_revenue
FROM escrow_transactions
WHERE status = 'released'
GROUP BY DATE_TRUNC('month', released_at)
ORDER BY month DESC;

-- View: Pending escrow releases (need attention)
CREATE OR REPLACE VIEW pending_escrow_releases AS
SELECT
    et.id,
    et.project_id,
    p.title AS project_title,
    et.buyer_id,
    buyer.name AS buyer_name,
    et.creator_id,
    creator.name AS creator_name,
    et.amount,
    et.status,
    et.escrow_type,
    et.auto_release_at,
    CASE
        WHEN et.auto_release_at <= CURRENT_TIMESTAMP THEN 'overdue'
        WHEN et.auto_release_at <= CURRENT_TIMESTAMP + INTERVAL '3 days' THEN 'upcoming'
        ELSE 'scheduled'
    END AS urgency,
    et.held_at,
    CURRENT_TIMESTAMP - et.held_at AS days_held
FROM escrow_transactions et
JOIN projects p ON et.project_id = p.id
JOIN accounts buyer ON et.buyer_id = buyer.id
JOIN accounts creator ON et.creator_id = creator.id
WHERE et.status = 'held'
ORDER BY et.auto_release_at ASC;

-- ============================================================================
-- SECURITY & COMPLIANCE
-- ============================================================================

-- Row Level Security (RLS) - Enable for sensitive data
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own escrow accounts
CREATE POLICY escrow_accounts_self_only ON escrow_accounts
    FOR ALL
    USING (account_id = current_setting('app.current_user_id')::INTEGER);

-- Policy: Users can see transactions they're involved in
CREATE POLICY escrow_transactions_involved_parties ON escrow_transactions
    FOR ALL
    USING (
        buyer_id = current_setting('app.current_user_id')::INTEGER OR
        creator_id = current_setting('app.current_user_id')::INTEGER
    );

-- Policy: Users can only see their own payment methods
CREATE POLICY payment_methods_self_only ON payment_methods
    FOR ALL
    USING (account_id = current_setting('app.current_user_id')::INTEGER);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE escrow_accounts IS 'Stripe Connect accounts for creators to receive payouts';
COMMENT ON TABLE escrow_transactions IS 'Escrow transactions tied to project milestones (50% upfront, 50% completion)';
COMMENT ON TABLE payment_methods IS 'Buyer payment methods stored in Stripe';
COMMENT ON TABLE payout_schedule IS 'Scheduled payouts to creators';
COMMENT ON TABLE escrow_events_log IS 'Audit log of all escrow events for compliance';
