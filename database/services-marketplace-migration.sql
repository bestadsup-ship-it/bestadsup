-- Services Marketplace Migration
-- Transform products table to support B2B service packages
-- Date: 2026-02-27

-- ==============================================
-- STEP 1: CREATE OR EXTEND PRODUCTS TABLE FOR SERVICES
-- ==============================================

-- Create products table if it doesn't exist (for services)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Basic service info
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Service-specific fields
  delivery_time_days INTEGER, -- How long until delivery (e.g., 7, 14, 30)
  revisions_included INTEGER DEFAULT 1, -- Number of revisions included

  -- Service details
  includes TEXT[], -- Array of what's included (e.g., ['Strategy doc', '3 campaign concepts'])
  requirements TEXT, -- What creator needs from client

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 999, -- High number = always available
  slots_available INTEGER, -- For time-based availability

  -- Metrics
  total_orders INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if table already exists
DO $$
BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_days INTEGER;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS revisions_included INTEGER DEFAULT 1;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS includes TEXT[];
  ALTER TABLE products ADD COLUMN IF NOT EXISTS requirements TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS slots_available INTEGER;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0.0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ==============================================
-- STEP 2: CREATE CART TABLES
-- ==============================================

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  custom_requirements TEXT, -- Client's specific needs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, product_id)
);

-- ==============================================
-- STEP 3: CREATE ORDERS & TRANSACTIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Order totals
  subtotal DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL, -- 10-15% commission
  total DECIMAL(10,2) NOT NULL,

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'failed', 'refunded'
  )),
  payment_method VARCHAR(50),
  payment_id VARCHAR(255), -- External payment processor ID

  -- Shipping/contact info
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  notes TEXT,

  -- Status
  order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN (
    'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'
  )),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Item details (snapshot at time of purchase)
  service_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,

  -- Delivery
  delivery_time_days INTEGER,
  custom_requirements TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled'
  )),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- ==============================================
-- STEP 4: CREATE REVIEWS & RATINGS
-- ==============================================

CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT NOT NULL,

  -- Metrics
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),

  -- Response
  creator_response TEXT,
  creator_responded_at TIMESTAMP,

  -- Moderation
  is_verified_purchase BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(order_item_id, reviewer_id)
);

-- ==============================================
-- STEP 5: CREATE SERVICE CATEGORIES
-- ==============================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Emoji or icon name
  service_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default B2B marketing service categories
INSERT INTO service_categories (name, slug, description, icon) VALUES
  ('Content Marketing', 'content-marketing', 'Blog posts, whitepapers, case studies', '📝'),
  ('Social Media Management', 'social-media', 'Content creation, scheduling, community management', '📱'),
  ('Paid Advertising', 'paid-ads', 'Google Ads, Facebook Ads, LinkedIn Ads management', '🎯'),
  ('SEO Services', 'seo', 'Keyword research, on-page optimization, link building', '🔍'),
  ('Email Marketing', 'email-marketing', 'Campaign design, automation, list management', '📧'),
  ('Marketing Strategy', 'strategy', 'Marketing plans, competitive analysis, positioning', '🎲'),
  ('Video Production', 'video', 'Video ads, explainer videos, testimonials', '🎬'),
  ('Graphic Design', 'design', 'Social graphics, infographics, presentations', '🎨'),
  ('Copywriting', 'copywriting', 'Website copy, landing pages, sales emails', '✍️'),
  ('Analytics & Reporting', 'analytics', 'Dashboard setup, data analysis, insights', '📊')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_account_id ON cart_items(account_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_creator_id ON order_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON service_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_creator_id ON service_reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON service_reviews(rating DESC);

-- ==============================================
-- STEP 7: CREATE TRIGGERS
-- ==============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update product stats when review is added
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET
    avg_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM service_reviews
      WHERE product_id = NEW.product_id AND is_hidden = FALSE
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM service_reviews
      WHERE product_id = NEW.product_id AND is_hidden = FALSE
    )
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rating_on_review ON service_reviews;
CREATE TRIGGER update_rating_on_review
    AFTER INSERT ON service_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

-- Increment order count when order is completed
CREATE OR REPLACE FUNCTION increment_product_orders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE products
    SET total_orders = total_orders + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_orders_on_complete ON order_items;
CREATE TRIGGER increment_orders_on_complete
    AFTER UPDATE ON order_items
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION increment_product_orders();

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE 'Services Marketplace migration completed successfully!';
  RAISE NOTICE 'Tables created: products, cart_items, orders, order_items, service_reviews, service_categories';
  RAISE NOTICE 'Indexes created: 15+';
  RAISE NOTICE 'Triggers created: 6';
  RAISE NOTICE 'Default categories inserted: 10';
END $$;
