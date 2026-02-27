import { Router } from 'express';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Follow an account
router.post('/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId: followingId } = req.params;
    const followerId = req.accountId;

    // Prevent following yourself
    if (followerId === followingId) {
      res.status(400).json({ message: 'Cannot follow yourself' });
      return;
    }

    // Insert follow relationship (ON CONFLICT prevents duplicates)
    await pool.query(
      `INSERT INTO follows (follower_id, following_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (follower_id, following_id)
       DO UPDATE SET status = 'active'`,
      [followerId, followingId]
    );

    res.json({ message: 'Successfully followed account' });
  } catch (error) {
    console.error('Error following account:', error);
    res.status(500).json({ message: 'Failed to follow account' });
  }
});

// Unfollow an account
router.delete('/:accountId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { accountId: followingId } = req.params;
    const followerId = req.accountId;

    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    res.json({ message: 'Successfully unfollowed account' });
  } catch (error) {
    console.error('Error unfollowing account:', error);
    res.status(500).json({ message: 'Failed to unfollow account' });
  }
});

// Get accounts the user is following
router.get('/following', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        a.id,
        a.email,
        a.name,
        a.username,
        a.avatar_url,
        a.bio
      FROM follows f
      JOIN accounts a ON f.following_id = a.id
      WHERE f.follower_id = $1 AND f.status = 'active'
      ORDER BY f.created_at DESC`,
      [accountId]
    );

    const following = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name || row.email,
      username: row.username,
      avatar: row.avatar_url || '/BestAdsUp.jpg',
      bio: row.bio,
    }));

    res.json(following);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ message: 'Failed to fetch following' });
  }
});

// Get accounts following the user
router.get('/followers', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT
        a.id,
        a.email,
        a.name,
        a.username,
        a.avatar_url,
        a.bio,
        EXISTS(
          SELECT 1 FROM follows
          WHERE follower_id = $1 AND following_id = a.id
        ) as is_following_back
      FROM follows f
      JOIN accounts a ON f.follower_id = a.id
      WHERE f.following_id = $1 AND f.status = 'active'
      ORDER BY f.created_at DESC`,
      [accountId]
    );

    const followers = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name || row.email,
      username: row.username,
      avatar: row.avatar_url || '/BestAdsUp.jpg',
      bio: row.bio,
      isFollowingBack: row.is_following_back,
    }));

    res.json(followers);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Failed to fetch followers' });
  }
});

export default router;
