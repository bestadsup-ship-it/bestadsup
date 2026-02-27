import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentCommentId: z.string().uuid().optional(),
});

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/comments', '');
  const segments = path.split('/').filter(Boolean);

  // GET /comments/post/:postId - Get comments for a post
  if (event.httpMethod === 'GET' && segments[0] === 'post' && segments[1]) {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[1];

        const result = await pool.query(
          `SELECT
            c.id,
            c.content,
            c.likes_count,
            c.replies_count,
            c.parent_comment_id,
            c.created_at,
            c.updated_at,
            a.id as author_id,
            a.email as author_email,
            a.name as author_name,
            a.username as author_username,
            a.avatar_url as author_avatar,
            EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.account_id = $2) as is_liked
          FROM comments c
          JOIN accounts a ON c.account_id = a.id
          WHERE c.post_id = $1 AND c.deleted_at IS NULL
          ORDER BY c.created_at ASC`,
          [postId, accountId]
        );

        const comments = result.rows.map(row => ({
          id: row.id,
          content: row.content,
          likesCount: row.likes_count,
          repliesCount: row.replies_count,
          parentCommentId: row.parent_comment_id,
          isLiked: row.is_liked,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: {
            id: row.author_id,
            name: row.author_name || row.author_username || row.author_email,
            username: row.author_username,
            email: row.author_email,
            avatar: row.author_avatar || '/BestAdsUp.jpg',
          },
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comments),
        };
      } catch (error) {
        console.error('Error fetching comments:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch comments' }),
        };
      }
    })(event);
  }

  // POST /comments/post/:postId - Create a comment on a post
  if (event.httpMethod === 'POST' && segments[0] === 'post' && segments[1]) {
    return withAuth(async (event, { accountId }) => {
      try {
        const postId = segments[1];
        const data = createCommentSchema.parse(JSON.parse(event.body || '{}'));

        // Verify post exists
        const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
        if (postCheck.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Post not found' }),
          };
        }

        // If parent comment ID is provided, verify it exists and belongs to the same post
        if (data.parentCommentId) {
          const parentCheck = await pool.query(
            'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
            [data.parentCommentId, postId]
          );
          if (parentCheck.rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ message: 'Parent comment not found' }),
            };
          }
        }

        const result = await pool.query(
          `INSERT INTO comments (
            post_id,
            account_id,
            parent_comment_id,
            content,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())
          RETURNING
            id,
            content,
            likes_count,
            replies_count,
            parent_comment_id,
            created_at`,
          [postId, accountId, data.parentCommentId || null, data.content]
        );

        const comment = result.rows[0];
        const accountResult = await pool.query(
          'SELECT email, name, username, avatar_url FROM accounts WHERE id = $1',
          [accountId]
        );
        const account = accountResult.rows[0];

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: comment.id,
            content: comment.content,
            likesCount: 0,
            repliesCount: 0,
            parentCommentId: comment.parent_comment_id,
            isLiked: false,
            createdAt: comment.created_at,
            updatedAt: comment.created_at,
            author: {
              id: accountId,
              name: account.name || account.username || account.email,
              username: account.username,
              email: account.email,
              avatar: account.avatar_url || '/BestAdsUp.jpg',
            },
          }),
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid comment data', errors: error.errors }),
          };
        }
        console.error('Error creating comment:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to create comment' }),
        };
      }
    })(event);
  }

  // DELETE /comments/:commentId - Delete a comment
  if (event.httpMethod === 'DELETE' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const commentId = segments[0];

        // Soft delete - set deleted_at timestamp
        const result = await pool.query(
          `UPDATE comments
          SET deleted_at = NOW()
          WHERE id = $1 AND account_id = $2 AND deleted_at IS NULL
          RETURNING id`,
          [commentId, accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Comment not found or unauthorized' }),
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Comment deleted successfully' }),
        };
      } catch (error) {
        console.error('Error deleting comment:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to delete comment' }),
        };
      }
    })(event);
  }

  // POST /comments/:commentId/like - Like a comment
  if (event.httpMethod === 'POST' && segments.length === 2 && segments[1] === 'like') {
    return withAuth(async (event, { accountId }) => {
      try {
        const commentId = segments[0];

        // Insert into comment_likes table (ON CONFLICT DO NOTHING prevents duplicate likes)
        await pool.query(
          'INSERT INTO comment_likes (account_id, comment_id) VALUES ($1, $2) ON CONFLICT (account_id, comment_id) DO NOTHING',
          [accountId, commentId]
        );

        // Get updated like count
        const result = await pool.query(
          'SELECT likes_count FROM comments WHERE id = $1',
          [commentId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Comment liked',
            likes: result.rows[0]?.likes_count || 0
          }),
        };
      } catch (error) {
        console.error('Error liking comment:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to like comment' }),
        };
      }
    })(event);
  }

  // DELETE /comments/:commentId/like - Unlike a comment
  if (event.httpMethod === 'DELETE' && segments.length === 2 && segments[1] === 'like') {
    return withAuth(async (event, { accountId }) => {
      try {
        const commentId = segments[0];

        // Delete from comment_likes table
        await pool.query(
          'DELETE FROM comment_likes WHERE account_id = $1 AND comment_id = $2',
          [accountId, commentId]
        );

        // Get updated like count
        const result = await pool.query(
          'SELECT likes_count FROM comments WHERE id = $1',
          [commentId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Comment unliked',
            likes: result.rows[0]?.likes_count || 0
          }),
        };
      } catch (error) {
        console.error('Error unliking comment:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to unlike comment' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
