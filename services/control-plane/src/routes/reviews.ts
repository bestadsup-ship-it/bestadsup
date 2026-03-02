import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool} from '../index';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const createReviewSchema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().optional(),
});

const creatorResponseSchema = z.object({
  creator_response: z.string().min(1),
});

const flagReviewSchema = z.object({
  flag_reason: z.string().min(1),
});

// ============================================
// POST /reviews - Create a review
// ============================================
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = createReviewSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Get order details
    const orderResult = await pool.query(
      `SELECT o.id, o.product_id, o.buyer_id, o.seller_id, o.status
       FROM orders o
       WHERE o.id = $1`,
      [validatedData.order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Verify user is the buyer
    if (order.buyer_id !== userId) {
      return res.status(403).json({ message: 'Only the buyer can review this order' });
    }

    // Verify order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed orders' });
    }

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE order_id = $1',
      [validatedData.order_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ message: 'Review already exists for this order' });
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (order_id, product_id, creator_id, buyer_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, order_id, product_id, creator_id, buyer_id, rating, review_text, created_at`,
      [
        validatedData.order_id,
        order.product_id,
        order.seller_id,
        userId,
        validatedData.rating,
        validatedData.review_text || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// GET /reviews/product/:productId - Get reviews for a product
// ============================================
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        r.id,
        r.rating,
        r.review_text,
        r.creator_response,
        r.creator_response_at,
        r.created_at,
        a.id as buyer_id,
        a.name as buyer_name,
        a.avatar_url as buyer_avatar,
        o.order_number
       FROM reviews r
       JOIN accounts a ON r.buyer_id = a.id
       JOIN orders o ON r.order_id = o.id
       WHERE r.product_id = $1 AND r.is_hidden = FALSE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_hidden = FALSE',
      [productId]
    );

    res.json({
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// GET /reviews/creator/:creatorId - Get reviews for a creator
// ============================================
router.get('/creator/:creatorId', async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        r.id,
        r.rating,
        r.review_text,
        r.creator_response,
        r.creator_response_at,
        r.created_at,
        a.id as buyer_id,
        a.name as buyer_name,
        a.avatar_url as buyer_avatar,
        p.id as product_id,
        p.name as product_name,
        o.order_number
       FROM reviews r
       JOIN accounts a ON r.buyer_id = a.id
       JOIN products p ON r.product_id = p.id
       JOIN orders o ON r.order_id = o.id
       WHERE r.creator_id = $1 AND r.is_hidden = FALSE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [creatorId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE creator_id = $1 AND is_hidden = FALSE',
      [creatorId]
    );

    res.json({
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching creator reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// GET /reviews/stats/product/:productId - Get rating stats for a product
// ============================================
router.get('/stats/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      'SELECT * FROM get_product_rating_stats($1)',
      [productId]
    );

    if (result.rows.length === 0 || result.rows[0].total_reviews === '0') {
      return res.json({
        average_rating: 0,
        total_reviews: 0,
        rating_distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product rating stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// GET /reviews/stats/creator/:creatorId - Get rating stats for a creator
// ============================================
router.get('/stats/creator/:creatorId', async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;

    const result = await pool.query(
      'SELECT * FROM get_creator_rating_stats($1)',
      [creatorId]
    );

    if (result.rows.length === 0 || result.rows[0].total_reviews === '0') {
      return res.json({
        average_rating: 0,
        total_reviews: 0,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching creator rating stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// GET /reviews/order/:orderId - Get review for a specific order
// ============================================
router.get('/order/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(
      `SELECT
        r.id,
        r.rating,
        r.review_text,
        r.creator_response,
        r.creator_response_at,
        r.created_at,
        a.id as buyer_id,
        a.name as buyer_name,
        a.avatar_url as buyer_avatar
       FROM reviews r
       JOIN accounts a ON r.buyer_id = a.id
       WHERE r.order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// PUT /reviews/:reviewId - Update a review
// ============================================
router.put('/:reviewId', authenticate, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const validatedData = updateReviewSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify user owns the review
    const reviewResult = await pool.query(
      'SELECT buyer_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (reviewResult.rows[0].buyer_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (validatedData.rating !== undefined) {
      updates.push(`rating = $${paramCount}`);
      values.push(validatedData.rating);
      paramCount++;
    }

    if (validatedData.review_text !== undefined) {
      updates.push(`review_text = $${paramCount}`);
      values.push(validatedData.review_text);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(reviewId);

    const result = await pool.query(
      `UPDATE reviews SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, rating, review_text, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// POST /reviews/:reviewId/response - Add creator response
// ============================================
router.post('/:reviewId/response', authenticate, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const validatedData = creatorResponseSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify user is the creator
    const reviewResult = await pool.query(
      'SELECT creator_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (reviewResult.rows[0].creator_id !== userId) {
      return res.status(403).json({ message: 'Only the creator can respond to this review' });
    }

    // Add response
    const result = await pool.query(
      `UPDATE reviews
       SET creator_response = $1, creator_response_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, creator_response, creator_response_at`,
      [validatedData.creator_response, reviewId]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('Error adding creator response:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// POST /reviews/:reviewId/flag - Flag a review for moderation
// ============================================
router.post('/:reviewId/flag', authenticate, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const validatedData = flagReviewSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await pool.query(
      `UPDATE reviews
       SET is_flagged = TRUE, flag_reason = $1, flagged_at = NOW(), flagged_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, is_flagged, flag_reason, flagged_at`,
      [validatedData.flag_reason, userId, reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Review flagged for moderation', review: result.rows[0] });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    console.error('Error flagging review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// DELETE /reviews/:reviewId - Delete a review
// ============================================
router.delete('/:reviewId', authenticate, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user owns the review
    const reviewResult = await pool.query(
      'SELECT buyer_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (reviewResult.rows[0].buyer_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
