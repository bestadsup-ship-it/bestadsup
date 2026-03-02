import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  category: z.string().max(100).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  category: z.string().max(100).optional(),
});

// GET /posts - Get all portfolio posts
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0, category, account_id } = req.query;

    const params: any[] = [];
    let whereClause = '';

    // Filter by category if provided
    if (category) {
      whereClause = `WHERE p.category = $${params.length + 1}`;
      params.push(String(category));
    }

    // Filter by account_id if provided (for viewing specific creator's portfolio)
    if (account_id) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ` p.account_id = $${params.length + 1}`;
      params.push(Number(account_id));
    }

    const query = `
      SELECT
        p.id,
        p.title,
        p.content,
        p.image_url,
        p.video_url,
        p.category,
        p.views,
        p.created_at,
        p.updated_at,
        p.account_id,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar,
        a.account_type
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    const posts = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      image: row.image_url,
      video: row.video_url,
      views: row.views || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.account_id,
        name: row.author_name || row.author_email,
        email: row.author_email,
        avatar: row.author_avatar || '/BestAdsUp.jpg',
        accountType: row.account_type,
      },
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// GET /posts/my-posts - Get current user's portfolio posts
router.get('/my-posts', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT
        p.id,
        p.title,
        p.content,
        p.image_url,
        p.video_url,
        p.category,
        p.views,
        p.created_at,
        p.updated_at
      FROM posts p
      WHERE p.account_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    const posts = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      image: row.image_url,
      video: row.video_url,
      views: row.views || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// GET /posts/:id - Get single post
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        p.id,
        p.title,
        p.content,
        p.image_url,
        p.video_url,
        p.category,
        p.views,
        p.created_at,
        p.updated_at,
        p.account_id,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar,
        a.account_type
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const row = result.rows[0];

    // Increment view count
    await pool.query(
      'UPDATE posts SET views = views + 1 WHERE id = $1',
      [id]
    );

    const post = {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      image: row.image_url,
      video: row.video_url,
      views: (row.views || 0) + 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.account_id,
        name: row.author_name || row.author_email,
        email: row.author_email,
        avatar: row.author_avatar || '/BestAdsUp.jpg',
        accountType: row.account_type,
      },
    };

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Failed to fetch post' });
  }
});

// POST /posts - Create new portfolio post
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = createPostSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO posts (
        account_id,
        title,
        content,
        image_url,
        video_url,
        category,
        views,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW())
      RETURNING id, title, content, image_url, video_url, category, views, created_at, updated_at`,
      [
        accountId,
        data.title,
        data.content,
        data.imageUrl || null,
        data.videoUrl || null,
        data.category || null,
      ]
    );

    const post = result.rows[0];

    res.status(201).json({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      image: post.image_url,
      video: post.video_url,
      views: post.views,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid post data',
        errors: error.errors,
      });
    }
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// PATCH /posts/:id - Update post
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;
    const data = updatePostSchema.parse(req.body);

    // Check if post belongs to user
    const ownerCheck = await pool.query(
      'SELECT account_id FROM posts WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (ownerCheck.rows[0].account_id !== accountId) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(data.content);
    }
    if (data.imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(data.imageUrl || null);
    }
    if (data.videoUrl !== undefined) {
      updates.push(`video_url = $${paramCount++}`);
      values.push(data.videoUrl || null);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(data.category);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE posts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, content, image_url, video_url, category, views, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const post = result.rows[0];

    res.json({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      image: post.image_url,
      video: post.video_url,
      views: post.views,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid post data',
        errors: error.errors,
      });
    }
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

// DELETE /posts/:id - Delete post
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;

    // Check if post belongs to user
    const ownerCheck = await pool.query(
      'SELECT account_id FROM posts WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (ownerCheck.rows[0].account_id !== accountId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

export default router;
