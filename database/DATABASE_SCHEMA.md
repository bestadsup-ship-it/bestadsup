# Database Schema Documentation
## BestAdsUp - Verified Performance Marketing Marketplace

**Last Updated:** February 28, 2026
**Database:** PostgreSQL 15+
**Total Tables:** 18+ core tables

---

## Table of Contents
1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Verification System](#verification-system)
5. [Escrow & Payments](#escrow--payments)
6. [Project Management](#project-management)
7. [Indexes & Performance](#indexes--performance)
8. [Triggers & Functions](#triggers--functions)

---

## Overview

### Database Design Principles
- **Verification-First:** All marketing results third-party verified
- **Escrow Protection:** Milestone-based payments with buyer protection
- **Audit Trail:** Complete history of all transactions and events
- **Scalability:** Indexed for performance at 10K+ users
- **Security:** Row-level security (RLS) on sensitive data

### Schema Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  Core Tables   │  │Verification │  │Escrow & Payments│
│  - accounts    │  │  - OAuth    │  │  - Stripe       │
│  - products    │  │  - badges   │  │  - milestones   │
│  - posts       │  │  - metrics  │  │  - transactions │
└────────────────┘  └─────────────┘  └─────────────────┘
                            │
                    ┌───────▼────────┐
                    │Project Mgmt    │
                    │  - projects    │
                    │  - milestones  │
                    │  - deliverables│
                    └────────────────┘
```

---

## Entity Relationship Diagram

### Core Entities

```
┌──────────────────────────────────────────────────────────────────┐
│                         CORE SCHEMA                              │
└──────────────────────────────────────────────────────────────────┘

    accounts (id, email, password_hash, account_type)
        │
        ├─── 1:N ──→ verification_connections (OAuth to GA4/HubSpot)
        │                   │
        │                   └─── 1:N ──→ verification_data (verified metrics)
        │                                      │
        │                                      └─── N:1 ──→ verification_badges
        │
        ├─── 1:N ──→ escrow_accounts (Stripe Connect)
        │                   │
        │                   └─── 1:N ──→ escrow_transactions (payments)
        │
        ├─── 1:N ──→ payment_methods (buyer credit cards)
        │
        ├─── 1:N ──→ projects (as buyer OR creator)
        │                   │
        │                   ├─── 1:N ──→ project_milestones
        │                   │                   │
        │                   │                   ├─── N:1 ──→ escrow_transactions
        │                   │                   └─── N:1 ──→ verification_data
        │                   │
        │                   ├─── 1:N ──→ project_deliverables
        │                   ├─── 1:N ──→ project_messages
        │                   └─── 1:N ──→ project_activity_log
        │
        └─── 1:N ──→ products (service listings)
```

### Detailed ERD (ASCII Art)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACCOUNTS TABLE                                │
│  PK: id (serial)                                                    │
│  - email (unique)                                                   │
│  - password_hash                                                    │
│  - account_type ('creator' | 'buyer')                              │
│  - verification_level ('none' | 'basic' | 'verified' | 'pro')      │
│  - has_verified_results (boolean)                                  │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                        │
         │ 1                      │ 1                      │ 1
         │                        │                        │
         ▼ N                      ▼ N                      ▼ N
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ verification_    │    │ escrow_accounts  │    │ payment_methods  │
│ connections      │    │ PK: id           │    │ PK: id           │
│ PK: id           │    │ FK: account_id   │    │ FK: account_id   │
│ FK: account_id   │    │ - stripe_account │    │ - stripe_pm_id   │
│ - provider       │    │ - status         │    │ - type           │
│ - access_token   │    │ - charges_enabled│    │ - last4          │
│ - refresh_token  │    └──────────────────┘    │ - is_default     │
└──────────────────┘              │              └──────────────────┘
         │ 1                      │ 1
         │                        │
         ▼ N                      ▼ N
┌──────────────────┐    ┌──────────────────────────────────────────┐
│ verification_    │    │ escrow_transactions                      │
│ data             │    │ PK: id                                   │
│ PK: id           │    │ FK: project_id                           │
│ FK: account_id   │    │ FK: buyer_id, creator_id                 │
│ FK: connection_id│    │ - amount                                 │
│ FK: project_id   │    │ - platform_fee (auto-calc 15%)           │
│ - source         │    │ - stripe_fee (auto-calc)                 │
│ - metric_type    │    │ - creator_payout (auto-calc)             │
│ - metric_value   │    │ - status ('pending'|'held'|'released')   │
│ - is_verified    │    │ - stripe_payment_intent_id               │
│ - api_response   │    │ - auto_release_at                        │
└──────────────────┘    └──────────────────────────────────────────┘
         │ N                                     │ 1
         │                                       │
         └─────────────┬─────────────────────────┘
                       │
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                        PROJECTS                                  │
│  PK: id                                                          │
│  FK: buyer_id → accounts(id)                                     │
│  FK: creator_id → accounts(id)                                   │
│  FK: service_id → products(id)                                   │
│  - title, description, requirements                              │
│  - total_amount, currency                                        │
│  - status ('pending'|'in_progress'|'completed'|'disputed')      │
│  - milestone tracking                                            │
│  - buyer_rating, buyer_review                                    │
│  - creator_rating, creator_review                                │
└──────────────────────────────────────────────────────────────────┘
         │ 1                 │ 1                 │ 1
         │                   │                   │
         ▼ N                 ▼ N                 ▼ N
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ project_     │  │ project_         │  │ project_activity_│
│ milestones   │  │ deliverables     │  │ log              │
│ PK: id       │  │ PK: id           │  │ PK: id           │
│ FK: project  │  │ FK: project_id   │  │ FK: project_id   │
│ - number     │  │ FK: milestone_id │  │ - event_type     │
│ - amount     │  │ FK: submitted_by │  │ - actor_id       │
│ - status     │  │ - file_url       │  │ - event_data     │
│ - submitted  │  │ - version        │  │ - timestamp      │
│ - approved   │  │ - status         │  └──────────────────┘
│ - auto_appr  │  └──────────────────┘
│   ove (7d)   │           │ 1
│ FK: escrow   │           │
│   _trans_id  │           ▼ N
│ FK: verif_   │  ┌──────────────────┐
│   data_id    │  │ project_messages │
└──────────────┘  │ PK: id           │
                  │ FK: project_id   │
                  │ FK: sender_id    │
                  │ FK: receiver_id  │
                  │ - message_text   │
                  │ - is_read        │
                  └──────────────────┘
```

---

## Core Tables

### accounts
**Purpose:** User accounts (Creators & Buyers)

```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),

    -- Account type
    account_type VARCHAR(20) DEFAULT 'creator'
        CHECK (account_type IN ('creator', 'buyer')),

    -- Verification status
    has_verified_results BOOLEAN DEFAULT false,
    verification_level VARCHAR(20) DEFAULT 'none',
        -- 'none', 'basic' (connected), 'verified' (3+ metrics), 'pro' (5+ metrics)

    -- Profile fields
    bio TEXT,
    specialties TEXT[],  -- For creators
    hourly_rate NUMERIC(10,2),  -- For creators
    portfolio_url TEXT,  -- For creators
    company_name VARCHAR(255),  -- For buyers
    industry VARCHAR(100),  -- For buyers
    team_size VARCHAR(50),  -- For buyers
    location VARCHAR(255),
    avatar_url TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_verification ON accounts(verification_level);
```

**Key Relationships:**
- 1:N → verification_connections
- 1:N → verification_badges
- 1:N → escrow_accounts
- 1:N → projects (as buyer or creator)

---

### products
**Purpose:** Service listings/packages that creators offer

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES accounts(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Pricing
    pricing_type VARCHAR(50),  -- 'hourly', 'fixed', 'milestone'
    price NUMERIC(10,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Service details
    delivery_days INTEGER,
    revisions_included INTEGER DEFAULT 2,

    -- Visibility
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Verification System

### verification_connections
**Purpose:** OAuth connections to third-party platforms (GA4, HubSpot, Stripe)

```sql
CREATE TABLE verification_connections (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL,  -- 'google_analytics_4', 'hubspot', 'stripe'
    provider_account_id VARCHAR(255),

    -- OAuth tokens (encrypted in production)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,

    scopes TEXT[],
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(50) DEFAULT 'active',

    UNIQUE(account_id, provider)
);
```

**Triggers:**
- Auto-updates `accounts.verification_level` when connections added

---

### verification_data
**Purpose:** Verified metrics pulled from third-party APIs

```sql
CREATE TABLE verification_data (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    connection_id INTEGER REFERENCES verification_connections(id),
    project_id INTEGER REFERENCES projects(id),  -- NULL for portfolio

    source VARCHAR(50) NOT NULL,  -- 'google_analytics_4', 'hubspot'
    metric_type VARCHAR(100) NOT NULL,  -- 'traffic', 'leads', 'conversions'

    metric_name VARCHAR(255),
    metric_value NUMERIC(15, 2),
    metric_change_percent NUMERIC(6, 2),  -- e.g., +127.5 for "+127%"

    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,

    -- Raw API response for transparency
    api_response_data JSONB,

    -- Display
    is_public BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Triggers:**
- Auto-grants verification badges when count >= 3

---

### verification_badges
**Purpose:** Badges displayed on creator profiles

```sql
CREATE TABLE verification_badges (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),

    badge_type VARCHAR(50) NOT NULL,
        -- 'verified_results', 'verified_identity', 'top_performer'

    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,  -- NULL = doesn't expire

    criteria_met JSONB,  -- Why badge was granted
    level VARCHAR(20) DEFAULT 'standard',  -- 'standard', 'gold', 'platinum'

    UNIQUE(account_id, badge_type)
);
```

---

## Escrow & Payments

### escrow_accounts
**Purpose:** Stripe Connect accounts for creator payouts

```sql
CREATE TABLE escrow_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) UNIQUE,

    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,  -- acct_xxx
    account_type VARCHAR(50) DEFAULT 'express',

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,

    onboarding_completed BOOLEAN DEFAULT false,
    has_bank_account BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### escrow_transactions
**Purpose:** Milestone-based payments (50% upfront, 50% completion)

```sql
CREATE TABLE escrow_transactions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    buyer_id INTEGER NOT NULL REFERENCES accounts(id),
    creator_id INTEGER NOT NULL REFERENCES accounts(id),

    -- Transaction details
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Fees (auto-calculated by trigger)
    platform_fee NUMERIC(10, 2),  -- 15% of amount
    stripe_fee NUMERIC(10, 2),  -- 2.9% + $0.30
    creator_payout NUMERIC(10, 2),  -- amount - all fees

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
        -- 'pending', 'held', 'released', 'refunded', 'disputed'
    escrow_type VARCHAR(50) NOT NULL,  -- 'upfront' (50%), 'completion' (50%)

    -- Stripe IDs
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),

    -- Auto-release
    auto_release_at TIMESTAMP,
    released_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Triggers:**
- `calculate_escrow_fees()` - Auto-calculates fees on INSERT
- `auto_release_escrow()` - Scheduled job releases funds after X days

---

### payment_methods
**Purpose:** Buyer payment methods (Stripe payment methods)

```sql
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),

    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,

    type VARCHAR(50) NOT NULL,  -- 'card', 'bank_account'
    brand VARCHAR(50),  -- 'visa', 'mastercard'
    last4 VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,

    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Triggers:**
- `ensure_one_default_payment_method()` - Only one default per account

---

## Project Management

### projects
**Purpose:** Main project/order table linking buyers and creators

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,

    -- Parties
    buyer_id INTEGER NOT NULL REFERENCES accounts(id),
    creator_id INTEGER NOT NULL REFERENCES accounts(id),
    service_id INTEGER REFERENCES products(id),

    -- Project details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    deliverables TEXT[],

    -- Pricing
    total_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Timeline
    estimated_delivery_days INTEGER,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
        -- 'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed'

    -- Workflow
    accepted_by_creator BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Performance
    revision_count INTEGER DEFAULT 0,
    revisions_included INTEGER DEFAULT 2,

    -- Communication
    last_message_at TIMESTAMP,
    unread_messages_buyer INTEGER DEFAULT 0,
    unread_messages_creator INTEGER DEFAULT 0,

    -- Ratings (post-completion)
    buyer_rating INTEGER CHECK (buyer_rating >= 1 AND buyer_rating <= 5),
    buyer_review TEXT,
    creator_rating INTEGER CHECK (creator_rating >= 1 AND creator_rating <= 5),
    creator_review TEXT,

    -- Dispute
    is_disputed BOOLEAN DEFAULT false,
    dispute_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_projects_buyer ON projects(buyer_id);
CREATE INDEX idx_projects_creator ON projects(creator_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_disputed ON projects(is_disputed) WHERE is_disputed = true;
```

---

### project_milestones
**Purpose:** Individual milestones within projects (50/50 split)

```sql
CREATE TABLE project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),

    milestone_number INTEGER NOT NULL,  -- 1, 2, 3...
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverables TEXT[],

    -- Verification
    requires_verification BOOLEAN DEFAULT false,
    verification_metric_type VARCHAR(100),
    verification_target_value NUMERIC(15, 2),
    verification_data_id INTEGER REFERENCES verification_data(id),

    -- Payment
    payment_amount NUMERIC(10, 2) NOT NULL,
    payment_percentage NUMERIC(5, 2),  -- 50.00 for 50%
    escrow_transaction_id INTEGER REFERENCES escrow_transactions(id),

    -- Timeline
    due_date DATE,
    completed_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
        -- 'pending', 'in_progress', 'submitted', 'approved', 'completed'

    -- Approval workflow
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,

    -- Auto-approval
    auto_approve_after_days INTEGER DEFAULT 7,
    auto_approved BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, milestone_number)
);
```

**Triggers:**
- `auto_approve_milestones()` - Auto-approves after 7 days if not reviewed
- `update_project_status_on_milestone_change()` - Updates project when all milestones complete

---

### project_deliverables
**Purpose:** Files/links submitted by creators

```sql
CREATE TABLE project_deliverables (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    milestone_id INTEGER REFERENCES project_milestones(id),
    submitted_by INTEGER NOT NULL REFERENCES accounts(id),

    title VARCHAR(255),
    description TEXT,
    file_type VARCHAR(50),  -- 'document', 'image', 'video', 'link'
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,

    -- Versioning
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,

    -- Status
    status VARCHAR(50) DEFAULT 'submitted',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### project_messages
**Purpose:** Communication between buyer and creator

```sql
CREATE TABLE project_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),

    sender_id INTEGER NOT NULL REFERENCES accounts(id),
    receiver_id INTEGER NOT NULL REFERENCES accounts(id),

    message_text TEXT NOT NULL,
    attachments TEXT[],

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Triggers:**
- `update_unread_count()` - Updates project.unread_messages_* when read

---

### project_activity_log
**Purpose:** Timeline of all project events

```sql
CREATE TABLE project_activity_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),

    event_type VARCHAR(100) NOT NULL,
        -- 'created', 'accepted', 'milestone_submitted', 'payment_released', etc.
    event_description TEXT,

    actor_id INTEGER REFERENCES accounts(id),
    actor_type VARCHAR(50),  -- 'buyer', 'creator', 'system', 'admin'

    milestone_id INTEGER REFERENCES project_milestones(id),
    event_data JSONB,

    is_visible_to_buyer BOOLEAN DEFAULT true,
    is_visible_to_creator BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Indexes & Performance

### Primary Indexes
All tables have primary key indexes by default.

### Foreign Key Indexes
```sql
-- Verification system
CREATE INDEX idx_verification_connections_account ON verification_connections(account_id);
CREATE INDEX idx_verification_data_account ON verification_data(account_id);
CREATE INDEX idx_verification_data_project ON verification_data(project_id);

-- Escrow system
CREATE INDEX idx_escrow_accounts_account ON escrow_accounts(account_id);
CREATE INDEX idx_escrow_transactions_project ON escrow_transactions(project_id);
CREATE INDEX idx_escrow_transactions_buyer ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_transactions_creator ON escrow_transactions(creator_id);

-- Project management
CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_deliverables_project ON project_deliverables(project_id);
CREATE INDEX idx_messages_project ON project_messages(project_id);
CREATE INDEX idx_activity_log_project ON project_activity_log(project_id);
```

### Composite Indexes
```sql
-- For auto-release queries
CREATE INDEX idx_escrow_auto_release
    ON escrow_transactions(auto_release_at)
    WHERE status = 'held';

-- For auto-approve queries
CREATE INDEX idx_milestone_auto_approve
    ON project_milestones(submitted_at, auto_approve_after_days)
    WHERE status = 'submitted' AND auto_approved = false;

-- For unread messages
CREATE INDEX idx_messages_unread
    ON project_messages(is_read, receiver_id)
    WHERE is_read = false;
```

### Performance Notes
- Expected queries/second: 100-500 at 10K users
- Largest tables: `project_activity_log`, `verification_data` (100K+ rows)
- Use `EXPLAIN ANALYZE` for slow queries
- Consider partitioning `project_activity_log` by date if > 1M rows

---

## Triggers & Functions

### Auto-Calculate Fees
```sql
CREATE OR REPLACE FUNCTION calculate_escrow_fees()
RETURNS TRIGGER AS $$
BEGIN
    NEW.platform_fee := ROUND(NEW.amount * 0.15, 2);  -- 15%
    NEW.stripe_fee := ROUND((NEW.amount * 0.029) + 0.30, 2);  -- 2.9% + $0.30
    NEW.creator_payout := NEW.amount - NEW.platform_fee - NEW.stripe_fee;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_fees_on_insert
    BEFORE INSERT ON escrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_escrow_fees();
```

### Auto-Grant Verification Badges
```sql
CREATE OR REPLACE FUNCTION auto_grant_verified_results_badge()
RETURNS TRIGGER AS $$
DECLARE
    verified_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO verified_count
    FROM verification_data
    WHERE account_id = NEW.account_id AND is_verified = true;

    IF verified_count >= 3 THEN
        INSERT INTO verification_badges (account_id, badge_type, criteria_met)
        VALUES (NEW.account_id, 'verified_results',
                jsonb_build_object('verified_metrics_count', verified_count))
        ON CONFLICT (account_id, badge_type) DO UPDATE
        SET criteria_met = jsonb_build_object('verified_metrics_count', verified_count);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Auto-Approve Milestones (Scheduled Job)
```sql
CREATE OR REPLACE FUNCTION auto_approve_milestones()
RETURNS void AS $$
DECLARE
    milestone RECORD;
BEGIN
    FOR milestone IN
        SELECT id, project_id, auto_approve_after_days
        FROM project_milestones
        WHERE status = 'submitted'
          AND submitted_at + (auto_approve_after_days || ' days')::INTERVAL <= CURRENT_TIMESTAMP
          AND auto_approved = false
    LOOP
        UPDATE project_milestones
        SET status = 'approved',
            approved_at = CURRENT_TIMESTAMP,
            auto_approved = true
        WHERE id = milestone.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule: Call daily via cron or pg_cron
-- SELECT auto_approve_milestones();
```

---

## Data Types Rationale

### NUMERIC vs INTEGER for Money
- Use `NUMERIC(10, 2)` for currency (not FLOAT)
- Avoids floating-point rounding errors
- Supports up to $99,999,999.99

### TEXT vs VARCHAR
- Use `TEXT` for unlimited length (descriptions, reviews)
- Use `VARCHAR(N)` for constrained fields (email, status)

### JSONB vs JSON
- Use `JSONB` (binary) for better indexing and querying
- Slightly slower to insert, much faster to query
- Can create GIN indexes on JSONB columns

### TIMESTAMP vs DATE
- Use `TIMESTAMP` for precise time tracking (events, logs)
- Use `DATE` for date-only fields (birthdays, deadlines)

---

## Security

### Row-Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
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
```

### Encrypted Fields (Application Layer)
- OAuth tokens (access_token, refresh_token)
- Stripe API keys
- Sensitive PII

---

## Migration Order

See [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) for complete details.

**CRITICAL ORDER:**
1. `schema.sql` (base tables)
2. `verification-system-migration.sql`
3. `escrow-payments-migration.sql`
4. `project-management-migration.sql`

---

## Related Documentation

- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Migration execution guide
- [TECHNICAL_SPEC.md](../TECHNICAL_SPEC.md) - API specifications
- [DEVELOPER_SETUP.md](../DEVELOPER_SETUP.md) - Setup instructions
- [PRD.md](../PRD.md) - Product requirements

---

**Document Version:** 1.0
**Created:** February 28, 2026
**Maintained By:** Engineering Team
