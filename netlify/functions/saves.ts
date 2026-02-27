import { Handler } from '@netlify/functions';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/saves', '');
  const segments = path.split('/').filter(Boolean);

  // POST /saves/:postId - Save/bookmark a post
  if (event.httpMethod === 'POST' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[0];

        // Check if post exists
        const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
        if (postCheck.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Post not found' }),
          };
        }

        // Insert save (ON CONFLICT DO NOTHING prevents duplicate saves)
        await pool.query(
          'INSERT INTO saves (account_id, post_id) VALUES ($1, $2) ON CONFLICT (account_id, post_id) DO NOTHING',
          [accountId, postId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Post saved successfully' }),
        };
      } catch (error) {
        console.error('Error saving post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to save post' }),
        };
      }
    })(event);
  }

  // DELETE /saves/:postId - Unsave/unbookmark a post
  if (event.httpMethod === 'DELETE' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[0];

        await pool.query(
          'DELETE FROM saves WHERE account_id = $1 AND post_id = $2',
          [accountId, postId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Post unsaved successfully' }),
        };
      } catch (error) {
        console.error('Error unsaving post:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to unsave post' }),
        };
      }
    })(event);
  }

  // GET /saves - Get all saved posts for current user
  if (event.httpMethod === 'GET' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const result = await pool.query(
          `SELECT
            p.id,
            p.content,
            p.image_url,
            p.video_url,
            p.is_promoted,
            p.views,
            p.clicks,
            p.likes_count,
            p.created_at,
            a.email as author_email,
            a.name as author_name,
            a.username as author_username,
            a.avatar_url as author_avatar,
            s.created_at as saved_at,
            EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.account_id = $1) as is_liked,
            EXISTS(SELECT 1 FROM saves s2 WHERE s2.post_id = p.id AND s2.account_id = $1) as is_saved
          FROM saves s
          JOIN posts p ON s.post_id = p.id
          JOIN accounts a ON p.account_id = a.id
          WHERE s.account_id = $1
          ORDER BY s.created_at DESC`,
          [accountId]
        );

        const posts = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          image: row.image_url,
          video: row.video_url,
          isPromoted: row.is_promoted,
          impressions: row.views || 0,
          clicks: row.clicks || 0,
          likes: row.likes_count || 0,
          isLiked: row.is_liked,
          isSaved: row.is_saved,
          createdAt: row.created_at,
          savedAt: row.saved_at,
          author: {
            name: row.author_name || row.author_username || row.author_email,
            username: row.author_username,
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
        console.error('Error fetching saved posts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch saved posts' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
