import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
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

const updateCreatorProfileSchema = z.object({
  tagline: z.string().max(255).optional(),
  specialties: z.array(z.string()).optional(),
  industriesServed: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  availabilityStatus: z.enum(['available', 'busy', 'not_accepting']).optional(),
  responseTime: z.string().max(50).optional(),
  certifications: z.array(z.string()).optional(),
  isAcceptingProjects: z.boolean().optional(),
});

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/profile', '');
  const segments = path.split('/').filter(Boolean);

  // GET /profile - Get current user's profile
  if (event.httpMethod === 'GET' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
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
            a.is_verified,
            a.verification_badge,
            a.is_private,
            a.email_verified,
            a.created_at,
            a.updated_at,
            (SELECT COUNT(*) FROM follows WHERE following_id = a.id) as followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = a.id) as following_count,
            (SELECT COUNT(*) FROM posts WHERE account_id = a.id) as posts_count,
            cp.tagline,
            cp.specialties,
            cp.industries_served,
            cp.years_experience,
            cp.hourly_rate,
            cp.currency,
            cp.availability_status,
            cp.response_time,
            cp.total_services,
            cp.total_sales,
            cp.avg_rating,
            cp.total_reviews,
            cp.certifications,
            cp.is_accepting_projects,
            cp.profile_views
          FROM accounts a
          LEFT JOIN creator_profiles cp ON cp.account_id = a.id
          WHERE a.id = $1`,
          [accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Profile not found' }),
          };
        }

        const profile = result.rows[0];

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
          isVerified: profile.is_verified,
          verificationBadge: profile.verification_badge,
          isPrivate: profile.is_private,
          emailVerified: profile.email_verified,
          followersCount: parseInt(profile.followers_count) || 0,
          followingCount: parseInt(profile.following_count) || 0,
          postsCount: parseInt(profile.posts_count) || 0,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        };

        // Add creator-specific data if applicable
        if (profile.account_type === 'creator' || profile.account_type === 'hybrid') {
          response.creatorProfile = {
            tagline: profile.tagline,
            specialties: profile.specialties || [],
            industriesServed: profile.industries_served || [],
            yearsExperience: profile.years_experience,
            hourlyRate: profile.hourly_rate,
            currency: profile.currency || 'USD',
            availabilityStatus: profile.availability_status || 'available',
            responseTime: profile.response_time,
            totalServices: profile.total_services || 0,
            totalSales: profile.total_sales || 0,
            avgRating: parseFloat(profile.avg_rating) || 0,
            totalReviews: profile.total_reviews || 0,
            certifications: profile.certifications || [],
            isAcceptingProjects: profile.is_accepting_projects !== false,
            profileViews: profile.profile_views || 0,
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        };
      } catch (error) {
        console.error('Error fetching profile:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch profile' }),
        };
      }
    })(event);
  }

  // GET /profile/:username - Get profile by username
  if (event.httpMethod === 'GET' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const username = segments[0];

        const result = await pool.query(
          `SELECT
            id,
            email,
            name,
            username,
            bio,
            avatar_url,
            cover_photo_url,
            company_name,
            job_title,
            website_url,
            location,
            linkedin_url,
            twitter_url,
            is_verified,
            is_private,
            created_at,
            (SELECT COUNT(*) FROM follows WHERE following_id = accounts.id AND status = 'active') as followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = accounts.id AND status = 'active') as following_count,
            (SELECT COUNT(*) FROM posts WHERE account_id = accounts.id) as posts_count,
            EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = accounts.id AND status = 'active') as is_following
          FROM accounts
          WHERE username = $1`,
          [username, accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Profile not found' }),
          };
        }

        const profile = result.rows[0];

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
            coverPhotoUrl: profile.cover_photo_url,
            companyName: profile.company_name,
            jobTitle: profile.job_title,
            websiteUrl: profile.website_url,
            location: profile.location,
            linkedinUrl: profile.linkedin_url,
            twitterUrl: profile.twitter_url,
            isVerified: profile.is_verified,
            isPrivate: profile.is_private,
            followersCount: parseInt(profile.followers_count),
            followingCount: parseInt(profile.following_count),
            postsCount: parseInt(profile.posts_count),
            isFollowing: profile.is_following,
            createdAt: profile.created_at,
          }),
        };
      } catch (error) {
        console.error('Error fetching profile:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch profile' }),
        };
      }
    })(event);
  }

  // PATCH /profile - Update current user's profile
  if (event.httpMethod === 'PATCH' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const data = updateProfileSchema.parse(JSON.parse(event.body || '{}'));

        // If username is being updated, check if it's already taken
        if (data.username) {
          const usernameCheck = await pool.query(
            'SELECT id FROM accounts WHERE username = $1 AND id != $2',
            [data.username, accountId]
          );
          if (usernameCheck.rows.length > 0) {
            return {
              statusCode: 400,
              body: JSON.stringify({ message: 'Username already taken' }),
            };
          }
        }

        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(data.name);
        }
        if (data.username !== undefined) {
          updates.push(`username = $${paramCount++}`);
          values.push(data.username);
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

        if (updates.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'No fields to update' }),
          };
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
            username,
            bio,
            avatar_url,
            cover_photo_url,
            company_name,
            job_title,
            website_url,
            location,
            linkedin_url,
            twitter_url,
            updated_at
        `;

        const result = await pool.query(query, values);
        const profile = result.rows[0];

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
            coverPhotoUrl: profile.cover_photo_url,
            companyName: profile.company_name,
            jobTitle: profile.job_title,
            websiteUrl: profile.website_url,
            location: profile.location,
            linkedinUrl: profile.linkedin_url,
            twitterUrl: profile.twitter_url,
            updatedAt: profile.updated_at,
          }),
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid profile data', errors: error.errors }),
          };
        }
        console.error('Error updating profile:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to update profile' }),
        };
      }
    })(event);
  }

  // PATCH /profile/creator - Update creator-specific profile fields
  if (event.httpMethod === 'PATCH' && segments[0] === 'creator') {
    return withAuth(async (event, { accountId }) => {
      try {
        // Check if user is a creator
        const accountCheck = await pool.query(
          'SELECT account_type FROM accounts WHERE id = $1',
          [accountId]
        );

        if (accountCheck.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Account not found' }),
          };
        }

        const accountType = accountCheck.rows[0].account_type;
        if (accountType !== 'creator' && accountType !== 'hybrid') {
          return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Only creators can update creator profile' }),
          };
        }

        const data = updateCreatorProfileSchema.parse(JSON.parse(event.body || '{}'));

        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.tagline !== undefined) {
          updates.push(`tagline = $${paramCount++}`);
          values.push(data.tagline);
        }
        if (data.specialties !== undefined) {
          updates.push(`specialties = $${paramCount++}`);
          values.push(data.specialties);
        }
        if (data.industriesServed !== undefined) {
          updates.push(`industries_served = $${paramCount++}`);
          values.push(data.industriesServed);
        }
        if (data.yearsExperience !== undefined) {
          updates.push(`years_experience = $${paramCount++}`);
          values.push(data.yearsExperience);
        }
        if (data.hourlyRate !== undefined) {
          updates.push(`hourly_rate = $${paramCount++}`);
          values.push(data.hourlyRate);
        }
        if (data.currency !== undefined) {
          updates.push(`currency = $${paramCount++}`);
          values.push(data.currency);
        }
        if (data.availabilityStatus !== undefined) {
          updates.push(`availability_status = $${paramCount++}`);
          values.push(data.availabilityStatus);
        }
        if (data.responseTime !== undefined) {
          updates.push(`response_time = $${paramCount++}`);
          values.push(data.responseTime);
        }
        if (data.certifications !== undefined) {
          updates.push(`certifications = $${paramCount++}`);
          values.push(data.certifications);
        }
        if (data.isAcceptingProjects !== undefined) {
          updates.push(`is_accepting_projects = $${paramCount++}`);
          values.push(data.isAcceptingProjects);
        }

        if (updates.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'No fields to update' }),
          };
        }

        updates.push(`updated_at = NOW()`);
        values.push(accountId);

        const query = `
          UPDATE creator_profiles
          SET ${updates.join(', ')}
          WHERE account_id = $${paramCount}
          RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Creator profile not found' }),
          };
        }

        const profile = result.rows[0];

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagline: profile.tagline,
            specialties: profile.specialties || [],
            industriesServed: profile.industries_served || [],
            yearsExperience: profile.years_experience,
            hourlyRate: profile.hourly_rate,
            currency: profile.currency,
            availabilityStatus: profile.availability_status,
            responseTime: profile.response_time,
            certifications: profile.certifications || [],
            isAcceptingProjects: profile.is_accepting_projects,
            updatedAt: profile.updated_at,
          }),
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid creator profile data', errors: error.errors }),
          };
        }
        console.error('Error updating creator profile:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to update creator profile' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
