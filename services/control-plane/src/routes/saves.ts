import { Router } from 'express';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /saves/:postId - Save a post
router.post('/:postId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const accountId = req.accountId;

    // Insert into post_saves (ON CONFLICT DO NOTHING prevents duplicate saves)
    await pool.query(
      'INSERT INTO post_saves (post_id, account_id) VALUES ($1, $2) ON CONFLICT (post_id, account_id) DO NOTHING',
      [postId, accountId]
    );

    res.json({ message: 'Post saved' });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ message: 'Failed to save post' });
  }
});

// DELETE /saves/:postId - Unsave a post
router.delete('/:postId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const accountId = req.accountId;

    await pool.query(
      'DELETE FROM post_saves WHERE post_id = $1 AND account_id = $2',
      [postId, accountId]
    );

    res.json({ message: 'Post unsaved' });
  } catch (error) {
    console.error('Error unsaving post:', error);
    res.status(500).json({ message: 'Failed to unsave post' });
  }
});

// GET /saves - Get all saved posts for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 50, offset = 0 } = req.query;

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
        p.comments,
        p.created_at,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar,
        ps.created_at as saved_at
      FROM post_saves ps
      JOIN posts p ON ps.post_id = p.id
      JOIN accounts a ON p.account_id = a.id
      WHERE ps.account_id = $1
      ORDER BY ps.created_at DESC
      LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    // Get tags for each post
    const posts = await Promise.all(result.rows.map(async (row) => {
      const tagsResult = await pool.query(
        `SELECT t.name
        FROM tags t
        JOIN post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = $1`,
        [row.id]
      );

      return {
        id: row.id,
        content: row.content,
        tags: tagsResult.rows.map(t => t.name),
        image: row.image_url,
        video: row.video_url,
        isPromoted: row.is_promoted,
        impressions: row.views || 0,
        clicks: row.clicks || 0,
        likes: row.likes_count || 0,
        commentsCount: row.comments || 0,
        createdAt: row.created_at,
        savedAt: row.saved_at,
        isSaved: true,
        author: {
          name: row.author_name || row.author_email,
          email: row.author_email,
          avatar: row.author_avatar || '/BestAdsUp.jpg',
        },
      };
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ message: 'Failed to fetch saved posts' });
  }
});

export default router;
