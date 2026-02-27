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
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
            (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as saves_count,
            p.created_at,
            a.id as author_id,
            a.email as author_email,
            a.name as author_name,
            a.avatar_url as author_avatar,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.account_id = $3) as is_liked,
            EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.account_id = $3) as is_saved,
            EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $3 AND f.following_id = p.account_id) as is_following_author
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
          ORDER BY p.created_at DESC
          LIMIT $1 OFFSET $2`,
          [limit, offset, accountId]
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
          commentsCount: parseInt(row.comments_count) || 0,
          savesCount: parseInt(row.saves_count) || 0,
          isLiked: row.is_liked,
          isSaved: row.is_saved,
          isFollowingAuthor: row.is_following_author,
          createdAt: row.created_at,
          author: {
            id: row.author_id,
            name: row.author_name || row.author_email,
            email: row.author_email,
            avatar: row.author_avatar || '/BestAdsUp.jpg',
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
            a.name as author_name,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.account_id = $1) as is_liked
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
          isLiked: row.is_liked,
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

  // GET /posts/liked - Get posts liked by current user
  if (event.httpMethod === 'GET' && segments[0] === 'liked') {
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
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
            (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as saves_count,
            p.created_at,
            a.id as author_id,
            a.email as author_email,
            a.name as author_name,
            a.avatar_url as author_avatar,
            TRUE as is_liked,
            EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.account_id = $1) as is_saved,
            EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.account_id) as is_following_author
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
          JOIN likes l ON p.id = l.post_id
          WHERE l.account_id = $1
          ORDER BY l.created_at DESC
          LIMIT $2 OFFSET $3`,
          [accountId, limit, offset]
        );

        const posts = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          imageUrl: row.image_url,
          videoUrl: row.video_url,
          isPromoted: row.is_promoted,
          views: row.views,
          clicks: row.clicks,
          likesCount: row.likes || 0,
          commentsCount: parseInt(row.comments_count) || 0,
          savesCount: parseInt(row.saves_count) || 0,
          createdAt: row.created_at,
          isLiked: row.is_liked,
          isSaved: row.is_saved,
          author: {
            id: row.author_id,
            email: row.author_email,
            name: row.author_name || row.author_email,
            avatar: row.author_avatar || '/BestAdsUp.jpg',
          },
          isFollowingAuthor: row.is_following_author,
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posts),
        };
      } catch (error) {
        console.error('Error fetching liked posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch liked posts' }),
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
            isLiked: false,
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

        // Insert into likes table (ON CONFLICT DO NOTHING prevents duplicate likes)
        await pool.query(
          'INSERT INTO likes (account_id, post_id) VALUES ($1, $2) ON CONFLICT (account_id, post_id) DO NOTHING',
          [accountId, postId]
        );

        // Get updated like count
        const result = await pool.query(
          'SELECT likes FROM posts WHERE id = $1',
          [postId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Post liked',
            likes: result.rows[0]?.likes || 0
          }),
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

        // Delete from likes table
        await pool.query(
          'DELETE FROM likes WHERE account_id = $1 AND post_id = $2',
          [accountId, postId]
        );

        // Get updated like count
        const result = await pool.query(
          'SELECT likes FROM posts WHERE id = $1',
          [postId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Post unliked',
            likes: result.rows[0]?.likes || 0
          }),
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

  // GET /posts/following - Get posts from accounts user follows
  if (event.httpMethod === 'GET' && segments[0] === 'following') {
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
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
            (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as saves_count,
            p.created_at,
            a.id as author_id,
            a.email as author_email,
            a.name as author_name,
            a.avatar_url as author_avatar,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.account_id = $1) as is_liked,
            EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.account_id = $1) as is_saved,
            TRUE as is_following_author
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
          WHERE EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = $1
            AND f.following_id = p.account_id
          )
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
          commentsCount: parseInt(row.comments_count) || 0,
          savesCount: parseInt(row.saves_count) || 0,
          isLiked: row.is_liked,
          isSaved: row.is_saved,
          isFollowingAuthor: row.is_following_author,
          createdAt: row.created_at,
          author: {
            id: row.author_id,
            name: row.author_name || row.author_email,
            email: row.author_email,
            avatar: row.author_avatar || '/BestAdsUp.jpg',
          },
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posts),
        };
      } catch (error) {
        console.error('Error fetching following posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch following posts' }),
        };
      }
    })(event);
  }

  // GET /posts/explore - Get posts for explore page with filtering
  if (event.httpMethod === 'GET' && segments[0] === 'explore') {
    return withAuth(async (event, { accountId }) => {
      try {
        const filter = event.queryStringParameters?.filter || 'trending';
        const limit = event.queryStringParameters?.limit || '50';
        const offset = event.queryStringParameters?.offset || '0';

        let query = '';
        let queryParams: any[] = [];

        // Base SELECT with all fields
        const baseSelect = `
          SELECT
            p.id,
            p.content,
            p.image_url,
            p.video_url,
            p.is_promoted,
            p.views,
            p.clicks,
            p.likes,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
            (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as saves_count,
            p.created_at,
            a.id as author_id,
            a.email as author_email,
            a.name as author_name,
            a.avatar_url as author_avatar,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.account_id = $1) as is_liked,
            EXISTS(SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.account_id = $1) as is_saved,
            EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = p.account_id) as is_following_author
          FROM posts p
          JOIN accounts a ON p.account_id = a.id
        `;

        switch (filter) {
          case 'trending':
            // Trending: High engagement in last 48 hours
            query = `${baseSelect}
              WHERE p.created_at >= NOW() - INTERVAL '48 hours'
              ORDER BY (p.likes + (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 2 + (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id)) DESC, p.created_at DESC
              LIMIT $2 OFFSET $3`;
            queryParams = [accountId, limit, offset];
            break;

          case 'popular':
            // Popular: Most likes and engagement all-time
            query = `${baseSelect}
              ORDER BY (p.likes + (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 2 + (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id)) DESC, p.created_at DESC
              LIMIT $2 OFFSET $3`;
            queryParams = [accountId, limit, offset];
            break;

          case 'recent':
            // Recent: Most recent posts
            query = `${baseSelect}
              ORDER BY p.created_at DESC
              LIMIT $2 OFFSET $3`;
            queryParams = [accountId, limit, offset];
            break;

          case 'promoted':
            // Promoted: Only promoted posts
            query = `${baseSelect}
              WHERE p.is_promoted = TRUE
              ORDER BY p.created_at DESC
              LIMIT $2 OFFSET $3`;
            queryParams = [accountId, limit, offset];
            break;

          default:
            query = `${baseSelect}
              ORDER BY p.created_at DESC
              LIMIT $2 OFFSET $3`;
            queryParams = [accountId, limit, offset];
        }

        const result = await pool.query(query, queryParams);

        const posts = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          image: row.image_url,
          video: row.video_url,
          isPromoted: row.is_promoted,
          impressions: row.views || 0,
          clicks: row.clicks || 0,
          likes: row.likes || 0,
          commentsCount: parseInt(row.comments_count) || 0,
          savesCount: parseInt(row.saves_count) || 0,
          isLiked: row.is_liked,
          isSaved: row.is_saved,
          isFollowingAuthor: row.is_following_author,
          createdAt: row.created_at,
          author: {
            id: row.author_id,
            name: row.author_name || row.author_email,
            email: row.author_email,
            avatar: row.author_avatar || '/BestAdsUp.jpg',
          },
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posts),
        };
      } catch (error) {
        console.error('Error fetching explore posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch explore posts' }),
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
