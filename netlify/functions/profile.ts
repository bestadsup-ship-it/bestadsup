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
            email_verified,
            created_at,
            updated_at,
            (SELECT COUNT(*) FROM follows WHERE following_id = accounts.id AND status = 'active') as followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = accounts.id AND status = 'active') as following_count,
            (SELECT COUNT(*) FROM posts WHERE account_id = accounts.id) as posts_count
          FROM accounts
          WHERE id = $1`,
          [accountId]
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
            emailVerified: profile.email_verified,
            followersCount: parseInt(profile.followers_count),
            followingCount: parseInt(profile.following_count),
            postsCount: parseInt(profile.posts_count),
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
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

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
