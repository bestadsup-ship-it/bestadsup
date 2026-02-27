import { Handler } from '@netlify/functions';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/follows', '');
  const segments = path.split('/').filter(Boolean);

  // POST /follows/:accountId - Follow a user
  if (event.httpMethod === 'POST' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const targetAccountId = segments[0];

        // Can't follow yourself
        if (targetAccountId === accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Cannot follow yourself' }),
          };
        }

        // Check if target account exists
        const accountCheck = await pool.query('SELECT id FROM accounts WHERE id = $1', [targetAccountId]);
        if (accountCheck.rows.length === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Account not found' }),
          };
        }

        // Insert follow relationship (ON CONFLICT DO NOTHING prevents duplicate follows)
        await pool.query(
          `INSERT INTO follows (follower_id, following_id, status)
          VALUES ($1, $2, 'active')
          ON CONFLICT (follower_id, following_id) DO NOTHING`,
          [accountId, targetAccountId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Successfully followed user' }),
        };
      } catch (error) {
        console.error('Error following user:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to follow user' }),
        };
      }
    })(event);
  }

  // DELETE /follows/:accountId - Unfollow a user
  if (event.httpMethod === 'DELETE' && segments.length === 1) {
    return withAuth(async (event, { accountId }) => {
      try {
        const targetAccountId = segments[0];

        await pool.query(
          'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
          [accountId, targetAccountId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Successfully unfollowed user' }),
        };
      } catch (error) {
        console.error('Error unfollowing user:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to unfollow user' }),
        };
      }
    })(event);
  }

  // GET /follows/followers - Get current user's followers
  if (event.httpMethod === 'GET' && segments[0] === 'followers') {
    return withAuth(async (event, { accountId }) => {
      try {
        const result = await pool.query(
          `SELECT
            a.id,
            a.email,
            a.name,
            a.username,
            a.avatar_url,
            a.bio,
            f.created_at as followed_at
          FROM follows f
          JOIN accounts a ON f.follower_id = a.id
          WHERE f.following_id = $1 AND f.status = 'active'
          ORDER BY f.created_at DESC`,
          [accountId]
        );

        const followers = result.rows.map(row => ({
          id: row.id,
          email: row.email,
          name: row.name || row.username || row.email,
          username: row.username,
          avatar: row.avatar_url || '/BestAdsUp.jpg',
          bio: row.bio,
          followedAt: row.followed_at,
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followers),
        };
      } catch (error) {
        console.error('Error fetching followers:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch followers' }),
        };
      }
    })(event);
  }

  // GET /follows/following - Get users the current user is following
  if (event.httpMethod === 'GET' && segments[0] === 'following') {
    return withAuth(async (event, { accountId }) => {
      try {
        const result = await pool.query(
          `SELECT
            a.id,
            a.email,
            a.name,
            a.username,
            a.avatar_url,
            a.bio,
            f.created_at as followed_at
          FROM follows f
          JOIN accounts a ON f.following_id = a.id
          WHERE f.follower_id = $1 AND f.status = 'active'
          ORDER BY f.created_at DESC`,
          [accountId]
        );

        const following = result.rows.map(row => ({
          id: row.id,
          email: row.email,
          name: row.name || row.username || row.email,
          username: row.username,
          avatar: row.avatar_url || '/BestAdsUp.jpg',
          bio: row.bio,
          followedAt: row.followed_at,
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(following),
        };
      } catch (error) {
        console.error('Error fetching following:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch following' }),
        };
      }
    })(event);
  }

  // GET /follows/status/:accountId - Check if following a specific user
  if (event.httpMethod === 'GET' && segments[0] === 'status' && segments[1]) {
    return withAuth(async (event, { accountId }) => {
      try {
        const targetAccountId = segments[1];

        const result = await pool.query(
          'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = \'active\'',
          [accountId, targetAccountId]
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isFollowing: result.rows.length > 0
          }),
        };
      } catch (error) {
        console.error('Error checking follow status:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to check follow status' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
