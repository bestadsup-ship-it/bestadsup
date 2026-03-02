-- Sprint 4: Orders & Project Management
-- This migration creates the infrastructure for buyers to purchase services
-- and manage projects with creators

-- ============================================================================
-- DROP OLD TABLES (from cart system)
-- ============================================================================
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
-- Tracks service purchases and their lifecycle
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Order Details
  order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "ORD-2024-001234"
  service_name VARCHAR(255) NOT NULL, -- Snapshot of service name at purchase
  service_description TEXT, -- Snapshot of description

  -- Pricing (snapshot at time of purchase)
  price NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  platform_fee NUMERIC(10, 2) DEFAULT 0, -- Our commission
  creator_earnings NUMERIC(10, 2) NOT NULL, -- What creator receives

  -- Selected Tier (if applicable)
  selected_tier_name VARCHAR(100), -- e.g., "Premium Package"
  selected_tier_price NUMERIC(10, 2),

  -- Timeline
  delivery_time_days INTEGER,
  expected_delivery_date TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
  -- Status flow:
  -- pending_payment → paid → in_progress → delivered → completed
  -- Can also be: cancelled, disputed, refunded

  -- Requirements from buyer
  buyer_requirements TEXT, -- What buyer needs from service

  -- Payment
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  paid_at TIMESTAMP,

  -- Refund
  refund_amount NUMERIC(10, 2) DEFAULT 0,
  refund_reason TEXT,
  refunded_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_creator ON orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_orders_service ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ============================================================================
-- PROJECT MESSAGES TABLE
-- ============================================================================
-- Communication between buyer and creator within an order
CREATE TABLE project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Message Content
  message TEXT NOT NULL,

  -- Attachments (stored as JSON array of URLs)
  attachments JSONB DEFAULT '[]',
  -- Example: [{"name": "design.png", "url": "https://...", "size": 12345, "type": "image/png"}]

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- System Messages
  is_system_message BOOLEAN DEFAULT FALSE, -- e.g., "Order status changed to In Progress"

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for project messages
CREATE INDEX IF NOT EXISTS idx_project_messages_order ON project_messages(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender ON project_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_unread ON project_messages(order_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- DELIVERABLES TABLE
-- ============================================================================
-- Files and work delivered by creator to buyer
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- URL to file storage (S3, etc.)
  file_size BIGINT, -- in bytes
  file_type VARCHAR(100), -- MIME type

  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Approval
  status VARCHAR(50) DEFAULT 'pending_review',
  -- Status: pending_review → approved → revision_requested → rejected

  approved_at TIMESTAMP,
  approved_by UUID REFERENCES accounts(id),

  rejection_reason TEXT,
  rejected_at TIMESTAMP,

  -- Revisions
  revision_number INTEGER DEFAULT 1, -- Track which revision this is
  parent_deliverable_id UUID REFERENCES deliverables(id), -- Link to previous version

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_order ON deliverables(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_uploaded_by ON deliverables(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);

-- ============================================================================
-- ORDER REVISIONS TABLE
-- ============================================================================
-- Track requested revisions and their status
CREATE TABLE order_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Revision Details
  revision_number INTEGER NOT NULL, -- 1st revision, 2nd revision, etc.
  description TEXT NOT NULL, -- What needs to be changed

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: pending → in_progress → completed → declined

  completed_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for order revisions
CREATE INDEX IF NOT EXISTS idx_order_revisions_order ON order_revisions(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_revisions_status ON order_revisions(status);

-- ============================================================================
-- ORDER TIMELINE TABLE
-- ============================================================================
-- Track all events that happen in an order's lifecycle
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- Who performed the action

  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  -- Types: order_created, payment_received, status_changed, message_sent,
  --        deliverable_uploaded, revision_requested, order_completed, etc.

  event_title VARCHAR(255) NOT NULL,
  event_description TEXT,

  -- Additional Data
  metadata JSONB DEFAULT '{}',
  -- Example: {"old_status": "paid", "new_status": "in_progress"}

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for order timeline
CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_timeline_event_type ON order_timeline(event_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update orders.updated_at on change
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON orders;
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Update project_messages.updated_at on change
DROP TRIGGER IF EXISTS trigger_update_project_messages_updated_at ON project_messages;
CREATE TRIGGER trigger_update_project_messages_updated_at
  BEFORE UPDATE ON project_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Update deliverables.updated_at on change
DROP TRIGGER IF EXISTS trigger_update_deliverables_updated_at ON deliverables;
CREATE TRIGGER trigger_update_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  new_number VARCHAR;
  year_part VARCHAR;
  sequence_part VARCHAR;
  max_sequence INTEGER;
BEGIN
  -- Get current year
  year_part := TO_CHAR(CURRENT_TIMESTAMP, 'YYYY');

  -- Get the max sequence for this year
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 10)::INTEGER), 0) + 1
  INTO max_sequence
  FROM orders
  WHERE order_number LIKE 'ORD-' || year_part || '-%';

  -- Pad with zeros to 6 digits
  sequence_part := LPAD(max_sequence::TEXT, 6, '0');

  -- Combine: ORD-2024-000001
  new_number := 'ORD-' || year_part || '-' || sequence_part;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (commented out - only for development)
-- ============================================================================

-- Example: Create a test order (UNCOMMENT TO USE)
-- INSERT INTO orders (
--   buyer_id,
--   creator_id,
--   service_id,
--   order_number,
--   service_name,
--   price,
--   creator_earnings,
--   status
-- ) VALUES (
--   (SELECT id FROM accounts WHERE account_type = 'buyer' LIMIT 1),
--   (SELECT id FROM accounts WHERE account_type = 'creator' LIMIT 1),
--   (SELECT id FROM products LIMIT 1),
--   generate_order_number(),
--   'Google Ads Campaign Management',
--   1999.00,
--   1799.10, -- 90% to creator (10% platform fee)
--   'paid'
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Order Status Flow:
-- 1. pending_payment: Order created, waiting for payment
-- 2. paid: Payment received, waiting for creator to start
-- 3. in_progress: Creator is working on the service
-- 4. delivered: Creator has delivered the work
-- 5. completed: Buyer has accepted the work, order is complete
--
-- Alternative states:
-- - cancelled: Order was cancelled before payment or before work started
-- - disputed: Buyer has raised a dispute
-- - refunded: Order was refunded
--
-- Platform Fee Calculation:
-- - Default: 10% platform fee
-- - Creator receives 90% of the order price
-- - Example: $1999 order → $199.90 platform fee → $1799.10 to creator
--
-- Expected Delivery Date:
-- - Calculated as: order.paid_at + service.delivery_time_days
-- - Updated when order status changes to 'paid'
--
-- Revision System:
-- - Tracks number of revisions used vs. service.revisions_included
-- - Each revision request creates an order_revisions record
-- - deliverables.revision_number increments with each new version
--
-- Timeline Events:
-- - Automatically logged for all major order events
-- - Used to display order history to buyer and creator
-- - Helps with support and dispute resolution
