-- Simple Service Enhancements Migration
-- Add service-specific fields to existing products table

-- Add service fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'service',
ADD COLUMN IF NOT EXISTS tagline VARCHAR(200),
ADD COLUMN IF NOT EXISTS what_you_get TEXT[],
ADD COLUMN IF NOT EXISTS ideal_for TEXT[],
ADD COLUMN IF NOT EXISTS portfolio_items JSONB,
ADD COLUMN IF NOT EXISTS faqs JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB;

-- Add product indexes
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_avg_rating ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_total_orders ON products(total_orders DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_includes ON products USING GIN(includes);

-- Add service_categories enhancements
ALTER TABLE service_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES service_categories(id),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_parent_id ON service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);
