import { Router } from 'express';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /notifications - Get all notifications for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

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
      } : null,
      post: row.post_id ? {
        content: row.post_content,
        imageUrl: row.post_image_url,
      } : null,
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// PATCH /notifications/mark-read - Mark notification(s) as read
router.patch('/mark-read', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { notificationId, markAll } = req.body;

    if (markAll) {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1 AND is_read = FALSE',
        [accountId]
      );
    } else if (notificationId) {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
        [notificationId, accountId]
      );
    } else {
      res.status(400).json({ message: 'Either notificationId or markAll must be provided' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

// GET /notifications/count - Get unread notification count
router.get('/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = FALSE',
      [accountId]
    );

    res.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ message: 'Failed to fetch notification count' });
  }
});

export default router;
