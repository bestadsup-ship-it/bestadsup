import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, username, avatar_url, bio, created_at FROM accounts WHERE id = $1',
      [req.accountId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.patch('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, username, bio, avatarUrl } = req.body;
    const accountId = req.accountId;

    // Check if username is taken (if provided and different from current)
    if (username) {
      const existingUser = await pool.query(
        'SELECT id FROM accounts WHERE username = $1 AND id != $2',
        [username, accountId]
      );
      if (existingUser.rows.length > 0) {
        res.status(400).json({ message: 'Username already taken' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE accounts
       SET name = COALESCE($1, name),
           username = COALESCE($2, username),
           bio = COALESCE($3, bio),
           avatar_url = COALESCE($4, avatar_url)
       WHERE id = $5
       RETURNING id, name, email, username, avatar_url, bio, created_at`,
      [name, username, bio, avatarUrl, accountId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get suggested accounts (hybrid approach)
router.get('/suggested', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { limit = 10 } = req.query;

    // Hybrid approach:
    // 1. Get accounts with similar interests (based on tags) - 40% weight
    // 2. Get popular accounts (most followers) - 30% weight
    // 3. Get active accounts (recent posts) - 30% weight
    // Exclude accounts already followed and the current user

    const result = await pool.query(
      `WITH similar_interests AS (
        -- Find accounts that use similar tags to what the current user posts
        SELECT
          a.id,
          a.email,
          a.name,
          a.username,
          a.avatar_url,
          a.bio,
          COUNT(DISTINCT pt.tag_id) as metric
        FROM accounts a
        JOIN posts p ON a.id = p.account_id
        JOIN post_tags pt ON p.id = pt.post_id
        WHERE pt.tag_id IN (
          -- Tags used by current user
          SELECT DISTINCT pt2.tag_id
          FROM posts p2
          JOIN post_tags pt2 ON p2.id = pt2.post_id
          WHERE p2.account_id = $1
          LIMIT 20
        )
        AND a.id != $1
        AND a.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = $1
        )
        GROUP BY a.id, a.email, a.name, a.username, a.avatar_url, a.bio
        ORDER BY metric DESC
        LIMIT $2
      ),
      popular_accounts AS (
        -- Find popular accounts
        SELECT
          a.id,
          a.email,
          a.name,
          a.username,
          a.avatar_url,
          a.bio,
          COUNT(f.follower_id) as metric
        FROM accounts a
        LEFT JOIN follows f ON a.id = f.following_id
        WHERE a.id != $1
        AND a.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = $1
        )
        GROUP BY a.id, a.email, a.name, a.username, a.avatar_url, a.bio
        HAVING COUNT(f.follower_id) > 0
        ORDER BY metric DESC
        LIMIT $2
      ),
      active_accounts AS (
        -- Find recently active accounts
        SELECT
          a.id,
          a.email,
          a.name,
          a.username,
          a.avatar_url,
          a.bio,
          COUNT(p.id) as metric
        FROM accounts a
        JOIN posts p ON a.id = p.account_id
        WHERE a.id != $1
        AND a.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = $1
        )
        AND p.created_at > NOW() - INTERVAL '30 days'
        GROUP BY a.id, a.email, a.name, a.username, a.avatar_url, a.bio
        ORDER BY metric DESC
        LIMIT $2
      ),
      combined AS (
        SELECT id, email, name, username, avatar_url, bio, metric FROM similar_interests
        UNION
        SELECT id, email, name, username, avatar_url, bio, metric FROM popular_accounts
        UNION
        SELECT id, email, name, username, avatar_url, bio, metric FROM active_accounts
      )
      SELECT
        c.id,
        c.email,
        c.name,
        c.username,
        c.avatar_url,
        c.bio,
        COALESCE(follower_counts.count, 0) as followers_count,
        COALESCE(post_counts.count, 0) as posts_count,
        false as is_verified
      FROM combined c
      LEFT JOIN (
        SELECT following_id, COUNT(*) as count
        FROM follows
        GROUP BY following_id
      ) follower_counts ON c.id = follower_counts.following_id
      LEFT JOIN (
        SELECT account_id, COUNT(*) as count
        FROM posts
        GROUP BY account_id
      ) post_counts ON c.id = post_counts.account_id
      ORDER BY RANDOM()
      LIMIT $2`,
      [accountId, limit]
    );

    const suggestions = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name || row.email,
      username: row.username,
      avatar: row.avatar_url || '/BestAdsUp.jpg',
      bio: row.bio,
      followersCount: parseInt(row.followers_count) || 0,
      postsCount: parseInt(row.posts_count) || 0,
      isVerified: row.is_verified || false,
    }));

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggested accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as accountsRouter };
