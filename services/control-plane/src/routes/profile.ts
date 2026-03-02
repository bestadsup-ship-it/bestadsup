import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  coverPhotoUrl: z.string().url().optional().or(z.literal('')),
  companyName: z.string().max(255).optional(),
  jobTitle: z.string().max(255).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().max(255).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

// Removed updateCreatorProfileSchema - creator-specific fields will be in products/services instead

// GET /profile - Get current user's profile
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        a.id,
        a.email,
        a.name,
        a.bio,
        a.avatar_url,
        a.cover_photo_url,
        a.company_name,
        a.job_title,
        a.website_url,
        a.location,
        a.linkedin_url,
        a.twitter_url,
        a.instagram_url,
        a.portfolio_url,
        a.account_type,
        a.verification_level,
        a.has_verified_results,
        a.created_at,
        a.updated_at,
        (SELECT COUNT(*) FROM verification_badges WHERE account_id = a.id) as verification_badges_count,
        (SELECT COUNT(*) FROM verification_data WHERE account_id = a.id AND is_verified = true) as verified_metrics_count,
        (SELECT COUNT(*) FROM products WHERE account_id = a.id) as services_count,
        (SELECT COUNT(*) FROM projects WHERE creator_id = a.id AND status = 'completed') as completed_projects_count
      FROM accounts a
      WHERE a.id = $1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const profile = result.rows[0];

    // Fetch verification badges
    const badgesResult = await pool.query(
      `SELECT badge_type, badge_level, verified_at, expires_at
       FROM verification_badges
       WHERE account_id = $1
       ORDER BY verified_at DESC`,
      [accountId]
    );

    const response: any = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      avatarUrl: profile.avatar_url,
      coverPhotoUrl: profile.cover_photo_url,
      companyName: profile.company_name,
      jobTitle: profile.job_title,
      websiteUrl: profile.website_url,
      location: profile.location,
      linkedinUrl: profile.linkedin_url,
      twitterUrl: profile.twitter_url,
      instagramUrl: profile.instagram_url,
      portfolioUrl: profile.portfolio_url,
      accountType: profile.account_type,
      verificationLevel: profile.verification_level || 'none',
      hasVerifiedResults: profile.has_verified_results || false,
      verificationBadgesCount: parseInt(profile.verification_badges_count) || 0,
      verificationBadges: badgesResult.rows.map(badge => ({
        type: badge.badge_type,
        level: badge.badge_level,
        verifiedAt: badge.verified_at,
        expiresAt: badge.expires_at,
      })),
      verifiedMetricsCount: parseInt(profile.verified_metrics_count) || 0,
      servicesCount: parseInt(profile.services_count) || 0,
      completedProjectsCount: parseInt(profile.completed_projects_count) || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PATCH /profile - Update current user's profile
router.patch('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const accountId = req.accountId;
    const data = updateProfileSchema.parse(req.body);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(data.avatarUrl || null);
    }
    if (data.coverPhotoUrl !== undefined) {
      updates.push(`cover_photo_url = $${paramCount++}`);
      values.push(data.coverPhotoUrl || null);
    }
    if (data.companyName !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(data.companyName);
    }
    if (data.jobTitle !== undefined) {
      updates.push(`job_title = $${paramCount++}`);
      values.push(data.jobTitle);
    }
    if (data.websiteUrl !== undefined) {
      updates.push(`website_url = $${paramCount++}`);
      values.push(data.websiteUrl || null);
    }
    if (data.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(data.location);
    }
    if (data.linkedinUrl !== undefined) {
      updates.push(`linkedin_url = $${paramCount++}`);
      values.push(data.linkedinUrl || null);
    }
    if (data.twitterUrl !== undefined) {
      updates.push(`twitter_url = $${paramCount++}`);
      values.push(data.twitterUrl || null);
    }
    if (data.instagramUrl !== undefined) {
      updates.push(`instagram_url = $${paramCount++}`);
      values.push(data.instagramUrl || null);
    }
    if (data.portfolioUrl !== undefined) {
      updates.push(`portfolio_url = $${paramCount++}`);
      values.push(data.portfolioUrl || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(accountId);

    const query = `
      UPDATE accounts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id,
        email,
        name,
        bio,
        avatar_url,
        cover_photo_url,
        company_name,
        job_title,
        website_url,
        location,
        linkedin_url,
        twitter_url,
        instagram_url,
        portfolio_url,
        updated_at
    `;

    const result = await pool.query(query, values);
    const profile = result.rows[0];

    res.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      coverPhotoUrl: profile.cover_photo_url,
      companyName: profile.company_name,
      jobTitle: profile.job_title,
      websiteUrl: profile.website_url,
      location: profile.location,
      linkedinUrl: profile.linkedin_url,
      twitterUrl: profile.twitter_url,
      instagramUrl: profile.instagram_url,
      portfolioUrl: profile.portfolio_url,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid profile data', errors: error.errors });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Note: Creator-specific fields (pricing, availability, etc.) are now managed through
// individual service listings (products table) rather than a single creator profile.
// This allows creators to offer multiple services with different pricing/availability.

export default router;
