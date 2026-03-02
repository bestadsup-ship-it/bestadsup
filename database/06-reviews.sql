-- Sprint 6: Reviews & Ratings System
-- This migration adds reviews functionality for buyers to rate completed orders

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: reviews
-- ============================================
-- Stores reviews left by buyers for completed orders
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Rating & content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,

  -- Response from creator
  creator_response TEXT,
  creator_response_at TIMESTAMPTZ,

  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES accounts(id),
  is_hidden BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_review_per_order UNIQUE(order_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_reviews_creator ON reviews(creator_id) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================
-- Update review timestamp on update
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_update_timestamp ON reviews;
CREATE TRIGGER reviews_update_timestamp
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_timestamp();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- Calculate aggregate ratings for a product/service
CREATE OR REPLACE FUNCTION get_product_rating_stats(p_product_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews BIGINT,
  rating_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*) as total_reviews,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution
  FROM reviews
  WHERE product_id = p_product_id AND is_hidden = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Calculate aggregate ratings for a creator
CREATE OR REPLACE FUNCTION get_creator_rating_stats(p_creator_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*) as total_reviews
  FROM reviews
  WHERE creator_id = p_creator_id AND is_hidden = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE reviews IS 'Reviews and ratings left by buyers for completed orders';
COMMENT ON COLUMN reviews.rating IS 'Star rating from 1-5';
COMMENT ON COLUMN reviews.review_text IS 'Written review from buyer';
COMMENT ON COLUMN reviews.creator_response IS 'Optional response from creator';
COMMENT ON COLUMN reviews.is_flagged IS 'Whether review has been flagged for moderation';
COMMENT ON COLUMN reviews.is_hidden IS 'Whether review is hidden from public view';
COMMENT ON FUNCTION get_product_rating_stats IS 'Get average rating and distribution for a product/service';
COMMENT ON FUNCTION get_creator_rating_stats IS 'Get average rating for a creator across all services';
