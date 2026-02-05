import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  isPromoted: z.boolean().default(false),
  budget: z.number().optional(),
  targetAudience: z.string().optional(),
});

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/posts', '');
  const segments = path.split('/').filter(Boolean);

  // GET /posts - Get all posts (feed)
  if (event.httpMethod === 'GET' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const limit = event.queryStringParameters?.limit || '50';
        const offset = event.queryStringParameters?.offset || '0';

        const result = await pool.query(
          `SELECT
            p.id,
            p.content,
            p.image_url,
            p.video_url,
            p.is_promoted,
            p.views,
            p.clicks,
            p.likes,
            p.created_at,
            a.email as author_email,
            a.name as author_name
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
          ORDER BY p.created_at DESC
          LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        const posts = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          image: row.image_url,
          video: row.video_url,
          isPromoted: row.is_promoted,
          impressions: row.views || 0,
          clicks: row.clicks || 0,
          likes: row.likes || 0,
          createdAt: row.created_at,
          author: {
            name: row.author_name || row.author_email,
            email: row.author_email,
            avatar: '/BestAdsUp.jpg',
          },
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posts),
        };
      } catch (error) {
        console.error('Error fetching posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch posts' }),
        };
      }
    })(event);
  }

  // GET /posts/my-posts - Get user's posts
  if (event.httpMethod === 'GET' && segments[0] === 'my-posts') {
    return withAuth(async (event, { accountId }) => {
      try {
        const limit = event.queryStringParameters?.limit || '50';
        const offset = event.queryStringParameters?.offset || '0';

        const result = await pool.query(
          `SELECT
            p.id,
            p.content,
            p.image_url,
            p.video_url,
            p.is_promoted,
            p.views,
            p.clicks,
            p.likes,
            p.created_at,
            a.email as author_email,
            a.name as author_name
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
          WHERE p.account_id = $1
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3`,
          [accountId, limit, offset]
        );

        const posts = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          image: row.image_url,
          video: row.video_url,
          isPromoted: row.is_promoted,
          impressions: row.views || 0,
          clicks: row.clicks || 0,
          likes: row.likes || 0,
          createdAt: row.created_at,
          author: {
            name: row.author_name || row.author_email,
            email: row.author_email,
            avatar: '/BestAdsUp.jpg',
          },
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posts),
        };
      } catch (error) {
        console.error('Error fetching user posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch posts' }),
        };
      }
    })(event);
  }

  // POST /posts - Create a post
  if (event.httpMethod === 'POST' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const data = createPostSchema.parse(JSON.parse(event.body || '{}'));

        const result = await pool.query(
          `INSERT INTO posts (
            account_id,
            content,
            image_url,
            video_url,
            is_promoted,
            budget,
            target_audience,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING
            id,
            content,
            image_url,
            video_url,
            is_promoted,
            views,
            clicks,
            likes,
            created_at`,
          [
            accountId,
            data.content,
            data.imageUrl || null,
            data.videoUrl || null,
            data.isPromoted,
            data.budget || null,
            data.targetAudience || null,
          ]
        );

        const post = result.rows[0];
        const accountResult = await pool.query(
          'SELECT email, name FROM accounts WHERE id = $1',
          [accountId]
        );
        const account = accountResult.rows[0];

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: post.id,
            content: post.content,
            image: post.image_url,
            video: post.video_url,
            isPromoted: post.is_promoted,
            impressions: 0,
            clicks: 0,
            likes: 0,
            createdAt: post.created_at,
            author: {
              name: account.name || account.email,
              email: account.email,
              avatar: '/BestAdsUp.jpg',
            },
          }),
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid post data', errors: error.errors }),
          };
        }
        console.error('Error creating post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to create post' }),
        };
      }
    })(event);
  }

  // POST /posts/:id/like - Like a post
  if (event.httpMethod === 'POST' && segments.length === 2 && segments[1] === 'like') {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[0];
        await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [postId]);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Post liked' }),
        };
      } catch (error) {
        console.error('Error liking post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to like post' }),
        };
      }
    })(event);
  }

  // DELETE /posts/:id/like - Unlike a post
  if (event.httpMethod === 'DELETE' && segments.length === 2 && segments[1] === 'like') {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[0];
        await pool.query('UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1', [postId]);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Post unliked' }),
        };
      } catch (error) {
        console.error('Error unliking post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to unlike post' }),
        };
      }
    })(event);
  }

  // DELETE /posts/:id - Delete a post
  if (event.httpMethod === 'DELETE' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[0];
        const result = await pool.query(
          'DELETE FROM posts WHERE id = $1 AND account_id = $2 RETURNING id',
          [postId, accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Post not found or unauthorized' }),
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Post deleted successfully' }),
        };
      } catch (error) {
        console.error('Error deleting post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to delete post' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
