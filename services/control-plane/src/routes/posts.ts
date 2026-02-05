import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  isPromoted: z.boolean().default(false),
  budget: z.number().optional(),
  targetAudience: z.string().optional(),
});

// Get all posts (feed)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
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

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// Get user's posts
router.get('/my-posts', authenticate, async (req: AuthRequest, res) => {
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

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// Create a post
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = createPostSchema.parse(req.body);

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

    res.status(201).json({
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
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid post data', errors: error.errors });
    } else {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Failed to create post' });
    }
  }
});

// Like a post
router.post('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE posts SET likes = likes + 1 WHERE id = $1',
      [id]
    );

    res.json({ message: 'Post liked' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Unlike a post
router.delete('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1',
      [id]
    );

    res.json({ message: 'Post unliked' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Failed to unlike post' });
  }
});

// Delete a post
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;

    // Check if the post belongs to the user
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND account_id = $2 RETURNING id',
      [id, accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Post not found or unauthorized' });
      return;
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

export default router;

