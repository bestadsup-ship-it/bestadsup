import { Handler } from '@netlify/functions';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/notifications', '');
  const segments = path.split('/').filter(Boolean);

  // GET /notifications - Get all notifications for current user
  if (event.httpMethod === 'GET' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const filter = event.queryStringParameters?.filter || 'all';
        const limit = event.queryStringParameters?.limit || '50';
        const offset = event.queryStringParameters?.offset || '0';

        let whereClause = 'WHERE n.recipient_id = $1';
        if (filter === 'unread') {
          whereClause += ' AND n.is_read = FALSE';
        }

        const result = await pool.query(
          `SELECT
            n.id,
            n.type,
            n.message,
            n.is_read,
            n.created_at,
            n.post_id,
            n.comment_id,
            actor.id as actor_id,
            actor.name as actor_name,
            actor.username as actor_username,
            actor.email as actor_email,
            actor.avatar_url as actor_avatar,
            actor.is_verified as actor_is_verified,
            p.content as post_content,
            p.image_url as post_image_url
          FROM notifications n
          LEFT JOIN accounts actor ON n.sender_id = actor.id
          LEFT JOIN posts p ON n.post_id = p.id
          ${whereClause}
          ORDER BY n.created_at DESC
          LIMIT $2 OFFSET $3`,
          [accountId, limit, offset]
        );

        const notifications = result.rows.map(row => ({
          id: row.id,
          type: row.type,
          message: row.message,
          isRead: row.is_read,
          createdAt: row.created_at,
          postId: row.post_id,
          commentId: row.comment_id,
          actor: row.actor_id ? {
            id: row.actor_id,
            name: row.actor_name || row.actor_username || row.actor_email,
            username: row.actor_username,
            email: row.actor_email,
            avatar: row.actor_avatar || '/BestAdsUp.jpg',
            isVerified: row.actor_is_verified,
          } : null,
          post: row.post_id ? {
            content: row.post_content,
            imageUrl: row.post_image_url,
          } : null,
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifications),
        };
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch notifications' }),
        };
      }
    })(event);
  }

  // PATCH /notifications/mark-read - Mark notification(s) as read
  if (event.httpMethod === 'PATCH' && segments[0] === 'mark-read') {
    return withAuth(async (event, { accountId }) => {
      try {
        const body = JSON.parse(event.body || '{}');
        const { notificationId, markAll } = body;

        if (markAll) {
          // Mark all notifications as read for the current user
          await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1 AND is_read = FALSE',
            [accountId]
          );
        } else if (notificationId) {
          // Mark specific notification as read
          await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
            [notificationId, accountId]
          );
        } else {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Either notificationId or markAll must be provided' }),
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true }),
        };
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to mark notifications as read' }),
        };
      }
    })(event);
  }

  // GET /notifications/count - Get unread notification count
  if (event.httpMethod === 'GET' && segments[0] === 'count') {
    return withAuth(async (event, { accountId }) => {
      try {
        const result = await pool.query(
          'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = FALSE',
          [accountId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: parseInt(result.rows[0].count) || 0 }),
        };
      } catch (error) {
        console.error('Error fetching notification count:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch notification count' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
