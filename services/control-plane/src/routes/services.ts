import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schema for service creation/update
const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  tagline: z.string().max(200).optional(),
  description: z.string(),
  category: z.string().min(1).max(100),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  deliveryTimeDays: z.number().int().positive().optional(),
  revisionsIncluded: z.number().int().nonnegative().optional(),
  includes: z.array(z.string()).optional(),
  whatYouGet: z.array(z.string()).optional(),
  idealFor: z.array(z.string()).optional(),
  requirements: z.string().optional(),
  tags: z.array(z.string()).optional(),
  portfolioItems: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    results: z.string().optional(),
  })).optional(),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
  pricingTiers: z.array(z.object({
    name: z.string(),
    price: z.number().positive(),
    description: z.string().optional(),
    deliverables: z.array(z.string()).optional(),
  })).optional(),
  slotsAvailable: z.number().int().nonnegative().optional(),
});

// GET /services - Get all services with creator info and verification badges
router.get('/', async (req, res) => {
  try {
    const { category, creator_id, verified_only, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        p.*,
        a.id as creator_id,
        a.name as creator_name,
        a.email as creator_email,
        a.avatar_url as creator_avatar,
        a.verification_level,
        a.verification_score,
        a.has_verified_results,
        COALESCE(
          json_agg(
            json_build_object(
              'type', vb.badge_type,
              'level', vb.badge_level,
              'verifiedAt', vb.verified_at
            )
          ) FILTER (WHERE vb.id IS NOT NULL),
          '[]'
        ) as verification_badges
      FROM products p
      LEFT JOIN accounts a ON p.creator_id = a.id
      LEFT JOIN verification_badges vb ON a.id = vb.account_id
    `;

    const params: any[] = [];
    const conditions: string[] = ['p.is_active = TRUE'];

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (creator_id) {
      params.push(creator_id);
      conditions.push(`p.creator_id = $${params.length}`);
    }

    if (verified_only === 'true') {
      conditions.push(`a.verification_level IN ('partial', 'verified')`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY p.id, a.id, a.name, a.email, a.avatar_url, a.verification_level,
               a.verification_score, a.has_verified_results
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    const services = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      category: row.category,
      imageUrl: row.image_url,
      price: parseFloat(row.price),
      currency: row.currency,
      deliveryTimeDays: row.delivery_time_days,
      revisionsIncluded: row.revisions_included,
      includes: row.includes || [],
      whatYouGet: row.what_you_get || [],
      idealFor: row.ideal_for || [],
      tags: row.tags || [],
      slotsAvailable: row.slots_available,
      totalOrders: row.total_orders,
      avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
      totalReviews: row.total_reviews,
      creator: {
        id: row.creator_id,
        name: row.creator_name,
        email: row.creator_email,
        avatarUrl: row.creator_avatar,
        verificationLevel: row.verification_level || 'none',
        verificationScore: row.verification_score || 0,
        hasVerifiedResults: row.has_verified_results || false,
        verificationBadges: row.verification_badges || [],
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
});

// GET /services/categories - Get service categories from service_categories table
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, description, icon, display_order
       FROM service_categories
       WHERE is_active = TRUE
       ORDER BY display_order, name`
    );

    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      displayOrder: row.display_order,
    }));

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /services/:id - Get single service with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        p.*,
        a.id as creator_id,
        a.name as creator_name,
        a.email as creator_email,
        a.avatar_url as creator_avatar,
        a.bio as creator_bio,
        a.verification_level,
        a.verification_score,
        a.has_verified_results,
        COALESCE(
          json_agg(
            json_build_object(
              'type', vb.badge_type,
              'level', vb.badge_level,
              'verifiedAt', vb.verified_at
            )
          ) FILTER (WHERE vb.id IS NOT NULL),
          '[]'
        ) as verification_badges
      FROM products p
      LEFT JOIN accounts a ON p.creator_id = a.id
      LEFT JOIN verification_badges vb ON a.id = vb.account_id
      WHERE p.id = $1
      GROUP BY p.id, a.id, a.name, a.email, a.avatar_url, a.bio,
               a.verification_level, a.verification_score, a.has_verified_results`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const row = result.rows[0];
    const service = {
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      category: row.category,
      imageUrl: row.image_url,
      price: parseFloat(row.price),
      currency: row.currency,
      deliveryTimeDays: row.delivery_time_days,
      revisionsIncluded: row.revisions_included,
      includes: row.includes || [],
      whatYouGet: row.what_you_get || [],
      idealFor: row.ideal_for || [],
      requirements: row.requirements,
      tags: row.tags || [],
      portfolioItems: row.portfolio_items || [],
      faqs: row.faqs || [],
      pricingTiers: row.pricing_tiers || [],
      slotsAvailable: row.slots_available,
      totalOrders: row.total_orders,
      avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
      totalReviews: row.total_reviews,
      creator: {
        id: row.creator_id,
        name: row.creator_name,
        email: row.creator_email,
        avatarUrl: row.creator_avatar,
        bio: row.creator_bio,
        verificationLevel: row.verification_level || 'none',
        verificationScore: row.verification_score || 0,
        hasVerifiedResults: row.has_verified_results || false,
        verificationBadges: row.verification_badges || [],
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Failed to fetch service' });
  }
});

// POST /services - Create new service (authenticated creators only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = createServiceSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO products (
        creator_id, name, tagline, description, category, image_url,
        price, currency, delivery_time_days, revisions_included,
        includes, what_you_get, ideal_for, requirements, tags,
        portfolio_items, faqs, pricing_tiers, slots_available,
        is_active, service_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE, 'service'
      )
      RETURNING *`,
      [
        accountId,
        data.name,
        data.tagline || null,
        data.description,
        data.category,
        data.imageUrl || null,
        data.price,
        data.currency,
        data.deliveryTimeDays || null,
        data.revisionsIncluded || null,
        data.includes || [],
        data.whatYouGet || [],
        data.idealFor || [],
        data.requirements || null,
        data.tags || [],
        data.portfolioItems ? JSON.stringify(data.portfolioItems) : null,
        data.faqs ? JSON.stringify(data.faqs) : null,
        data.pricingTiers ? JSON.stringify(data.pricingTiers) : null,
        data.slotsAvailable || null,
      ]
    );

    const service = result.rows[0];
    res.status(201).json({
      id: service.id,
      name: service.name,
      message: 'Service created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service data',
        errors: error.errors,
      });
    }
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Failed to create service' });
  }
});

// PUT /services/:id - Update service (creator only)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT creator_id FROM products WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (ownerCheck.rows[0].creator_id !== accountId) {
      return res.status(403).json({ message: 'You can only edit your own services' });
    }

    const data = createServiceSchema.partial().parse(req.body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      const columnMap: Record<string, string> = {
        name: 'name',
        tagline: 'tagline',
        description: 'description',
        category: 'category',
        imageUrl: 'image_url',
        price: 'price',
        currency: 'currency',
        deliveryTimeDays: 'delivery_time_days',
        revisionsIncluded: 'revisions_included',
        includes: 'includes',
        whatYouGet: 'what_you_get',
        idealFor: 'ideal_for',
        requirements: 'requirements',
        tags: 'tags',
        portfolioItems: 'portfolio_items',
        faqs: 'faqs',
        pricingTiers: 'pricing_tiers',
        slotsAvailable: 'slots_available',
      };

      const columnName = columnMap[key];
      if (columnName && value !== undefined) {
        updates.push(`${columnName} = $${paramCount++}`);
        // JSONB fields need to be stringified
        if (['portfolio_items', 'faqs', 'pricing_tiers'].includes(columnName)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid service data',
        errors: error.errors,
      });
    }
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Failed to update service' });
  }
});

// DELETE /services/:id - Delete service (creator only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND creator_id = $2 RETURNING id',
      [id, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found or not authorized' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

export default router;
