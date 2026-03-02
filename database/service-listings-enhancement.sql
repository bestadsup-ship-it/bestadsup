-- Service Listings Enhancement for B2B Marketplace
-- Sprint 3: Enable creators to list their services with rich details

-- Add service-specific fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'service', -- 'service' vs 'product' for future flexibility
ADD COLUMN IF NOT EXISTS tagline VARCHAR(200), -- Short compelling tagline
ADD COLUMN IF NOT EXISTS what_you_get TEXT[], -- Array of deliverables
ADD COLUMN IF NOT EXISTS ideal_for TEXT[], -- Array of ideal customer types
ADD COLUMN IF NOT EXISTS portfolio_items JSONB, -- Array of portfolio items {title, description, image_url, results}
ADD COLUMN IF NOT EXISTS faqs JSONB, -- Array of FAQs {question, answer}
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Searchable tags
ADD COLUMN IF NOT EXISTS pricing_tiers JSONB; -- Optional tiered pricing {name, price, description, deliverables[]}

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_avg_rating ON products(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_total_orders ON products(total_orders DESC);

-- GIN index for array and JSONB columns for efficient searching
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_includes ON products USING GIN(includes);

-- Service Categories Table (enhance existing table)
-- Table already exists, add missing columns
ALTER TABLE service_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES service_categories(id),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_parent_id ON service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);

-- Service categories already exist in database, skip insert
-- Categories are managed via admin panel or separate migration

-- Service Reviews Table (separate from general reviews)
CREATE TABLE IF NOT EXISTS service_reviews (
    id SERIAL PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER, -- Optional link to completed project
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT false,
    response_from_creator TEXT, -- Creator can respond to reviews
    response_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, buyer_id) -- One review per buyer per service
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_buyer_id ON service_reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_rating ON service_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_service_reviews_created_at ON service_reviews(created_at DESC);

-- Service Views Table (track impressions)
CREATE TABLE IF NOT EXISTS service_views (
    id SERIAL PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- NULL for anonymous
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referrer TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_service_views_service_id ON service_views(service_id);
CREATE INDEX IF NOT EXISTS idx_service_views_viewer_id ON service_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_service_views_viewed_at ON service_views(viewed_at DESC);

-- Function to update product stats after review
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the product's average rating and total reviews
    UPDATE products
    SET
        avg_rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM service_reviews WHERE service_id = NEW.service_id),
        total_reviews = (SELECT COUNT(*) FROM service_reviews WHERE service_id = NEW.service_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.service_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update product stats
DROP TRIGGER IF EXISTS trigger_update_product_review_stats ON service_reviews;
CREATE TRIGGER trigger_update_product_review_stats
    AFTER INSERT OR UPDATE OR DELETE ON service_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_review_stats();

-- Comments on tables for documentation
COMMENT ON TABLE products IS 'Service listings created by verified creators. Enhanced with portfolio, FAQs, and tiered pricing.';
COMMENT ON TABLE service_categories IS 'Predefined service categories for B2B marketplace (Paid Ads, SEO, Email, etc.)';
COMMENT ON TABLE service_reviews IS 'Buyer reviews for services. One review per buyer per service. Includes creator responses.';
COMMENT ON TABLE service_views IS 'Track service page views for analytics. Supports both authenticated and anonymous viewers.';

-- Helpful queries for reference
COMMENT ON COLUMN products.portfolio_items IS 'JSONB array: [{title: "Case Study", description: "...", image_url: "...", results: "150% increase"}]';
COMMENT ON COLUMN products.faqs IS 'JSONB array: [{question: "How long does it take?", answer: "2-3 weeks typically"}]';
COMMENT ON COLUMN products.pricing_tiers IS 'JSONB array: [{name: "Basic", price: 999, description: "...", deliverables: [...]}]';
