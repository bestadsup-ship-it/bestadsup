import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  tags: z.array(z.string()).max(10).default([]),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  isPromoted: z.boolean().default(false),
  budget: z.number().optional(),
  targetAudience: z.string().optional(),
});

// Get all posts (feed)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0, tag } = req.query;

    let query = `
      SELECT DISTINCT
        p.id,
        p.content,
        p.image_url,
        p.video_url,
        p.is_promoted,
        p.views,
        p.clicks,
        p.likes_count,
        p.created_at,
        p.account_id,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
    `;

    const params: any[] = [];

    // Filter by tag if provided
    if (tag) {
      query += `
        JOIN post_tags pt ON p.id = pt.post_id
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.normalized_name = $1
      `;
      params.push(String(tag).toLowerCase().replace(/^#/, ''));
    }

    query += `
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

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
        createdAt: row.created_at,
        author: {
          id: row.account_id,
          name: row.author_name || row.author_email,
          email: row.author_email,
          avatar: row.author_avatar || '/BestAdsUp.jpg',
        },
      };
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
        p.likes_count,
        p.created_at,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar
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
      likes: row.likes_count || 0,
      createdAt: row.created_at,
      author: {
        id: row.account_id,
        name: row.author_name || row.author_email,
        email: row.author_email,
        avatar: row.author_avatar || '/BestAdsUp.jpg',
      },
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// Get explore posts (trending, popular, recent, promoted)
router.get('/explore', authenticate, async (req: AuthRequest, res) => {
  try {
    const { filter = 'trending', limit = 50, offset = 0 } = req.query;

    let orderClause = '';
    let whereClause = '';

    switch (filter) {
      case 'trending':
        // Recent posts (last 7 days) with most engagement (likes + views)
        whereClause = 'WHERE p.created_at > NOW() - INTERVAL \'7 days\'';
        orderClause = 'ORDER BY (p.likes_count + p.views) DESC, p.created_at DESC';
        break;
      case 'popular':
        // All-time most liked posts
        orderClause = 'ORDER BY p.likes_count DESC, p.created_at DESC';
        break;
      case 'recent':
        // Most recent posts
        orderClause = 'ORDER BY p.created_at DESC';
        break;
      case 'promoted':
        // Promoted posts only
        whereClause = 'WHERE p.is_promoted = true';
        orderClause = 'ORDER BY p.created_at DESC';
        break;
      default:
        // Default to trending
        whereClause = 'WHERE p.created_at > NOW() - INTERVAL \'7 days\'';
        orderClause = 'ORDER BY (p.likes_count + p.views) DESC, p.created_at DESC';
    }

    const query = `
      SELECT
        p.id,
        p.content,
        p.image_url,
        p.video_url,
        p.is_promoted,
        p.views,
        p.clicks,
        p.likes_count,
        p.created_at,
        p.account_id,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      ${whereClause}
      ${orderClause}
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [Number(limit), Number(offset)]);

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
        createdAt: row.created_at,
        author: {
          id: row.account_id,
          name: row.author_name || row.author_email,
          email: row.author_email,
          avatar: row.author_avatar || '/BestAdsUp.jpg',
        },
      };
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching explore posts:', error);
    res.status(500).json({ message: 'Failed to fetch explore posts' });
  }
});

// Get posts from followed accounts
router.get('/following', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT DISTINCT
        p.id,
        p.content,
        p.image_url,
        p.video_url,
        p.is_promoted,
        p.views,
        p.clicks,
        p.likes_count,
        p.created_at,
        p.account_id,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      JOIN follows f ON p.account_id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3`,
      [accountId, Number(limit), Number(offset)]
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
        createdAt: row.created_at,
        author: {
          id: row.account_id,
          name: row.author_name || row.author_email,
          email: row.author_email,
          avatar: row.author_avatar || '/BestAdsUp.jpg',
        },
      };
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching following posts:', error);
    res.status(500).json({ message: 'Failed to fetch following posts' });
  }
});

// Get liked posts
router.get('/liked', authenticate, async (req: AuthRequest, res) => {
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
        p.created_at,
        a.email as author_email,
        a.name as author_name,
        a.avatar_url as author_avatar,
        pl.created_at as liked_at
      FROM post_likes pl
      JOIN posts p ON pl.post_id = p.id
      JOIN accounts a ON p.account_id = a.id
      WHERE pl.account_id = $1
      ORDER BY pl.created_at DESC
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
        createdAt: row.created_at,
        likedAt: row.liked_at,
        isLiked: true,
        author: {
          id: row.account_id,
          name: row.author_name || row.author_email,
          email: row.author_email,
          avatar: row.author_avatar || '/BestAdsUp.jpg',
        },
      };
    }));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    res.status(500).json({ message: 'Failed to fetch liked posts' });
  }
});

// Create a post
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const data = createPostSchema.parse(req.body);

    // Start transaction
    await pool.query('BEGIN');

    // Insert post
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
        likes_count,
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
    const postId = post.id;

    // Handle tags
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const normalized = tagName.toLowerCase().replace(/^#/, '');

        // Insert or get existing tag
        const tagResult = await pool.query(
          `INSERT INTO tags (name, normalized_name, use_count)
          VALUES ($1, $2, 1)
          ON CONFLICT (normalized_name)
          DO UPDATE SET use_count = tags.use_count + 1
          RETURNING id`,
          [tagName, normalized]
        );

        const tagId = tagResult.rows[0].id;

        // Link tag to post
        await pool.query(
          `INSERT INTO post_tags (post_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING`,
          [postId, tagId]
        );
      }
    }

    await pool.query('COMMIT');

    // Get author info
    const accountResult = await pool.query(
      'SELECT email, name FROM accounts WHERE id = $1',
      [accountId]
    );
    const account = accountResult.rows[0];

    res.status(201).json({
      id: post.id,
      content: post.content,
      tags: data.tags,
      image: post.image_url,
      video: post.video_url,
      isPromoted: post.is_promoted,
      impressions: 0,
      clicks: 0,
      likes: 0,
      createdAt: post.created_at,
      author: {
        id: accountId,
        name: account.name || account.email,
        email: account.email,
        avatar: '/BestAdsUp.jpg',
      },
    });
  } catch (error) {
    await pool.query('ROLLBACK');
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
    const accountId = req.accountId;

    // Insert into post_likes (ON CONFLICT DO NOTHING prevents duplicate likes)
    await pool.query(
      'INSERT INTO post_likes (post_id, account_id) VALUES ($1, $2) ON CONFLICT (post_id, account_id) DO NOTHING',
      [id, accountId]
    );

    // Update likes count
    await pool.query(
      'UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1',
      [id]
    );

    // Get updated count
    const result = await pool.query(
      'SELECT likes_count FROM posts WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Post liked',
      likes: result.rows[0]?.likes_count || 0
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Unlike a post
router.delete('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId;

    // Delete from post_likes
    await pool.query(
      'DELETE FROM post_likes WHERE post_id = $1 AND account_id = $2',
      [id, accountId]
    );

    // Update likes count
    await pool.query(
      'UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1',
      [id]
    );

    // Get updated count
    const result = await pool.query(
      'SELECT likes_count FROM posts WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Post unliked',
      likes: result.rows[0]?.likes_count || 0
    });
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

