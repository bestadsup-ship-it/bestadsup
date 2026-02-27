import { Handler } from '@netlify/functions';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/accounts', '');
  const segments = path.split('/').filter(Boolean);

  // GET /accounts/suggested - Get suggested accounts to follow
  if (event.httpMethod === 'GET' && segments[0] === 'suggested') {
    return withAuth(async (event, { accountId }) => {
      try {
        const limit = event.queryStringParameters?.limit || '10';

        // Find accounts that:
        // 1. Current user is NOT following
        // 2. Have the most followers (popular accounts)
        // 3. Are not the current user
        const result = await pool.query(
          `SELECT
            a.id,
            a.email,
            a.name,
            a.username,
            a.avatar_url,
            a.bio,
            a.is_verified,
            (SELECT COUNT(*) FROM follows WHERE following_id = a.id AND status = 'active') as followers_count,
            (SELECT COUNT(*) FROM posts WHERE account_id = a.id) as posts_count
          FROM accounts a
          WHERE a.id != $1
          AND NOT EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = $1
            AND f.following_id = a.id
            AND f.status = 'active'
          )
          ORDER BY followers_count DESC, posts_count DESC
          LIMIT $2`,
          [accountId, limit]
        );

        const accounts = result.rows.map(row => ({
          id: row.id,
          email: row.email,
          name: row.name || row.username || row.email,
          username: row.username,
          avatar: row.avatar_url || '/BestAdsUp.jpg',
          bio: row.bio,
          isVerified: row.is_verified,
          followersCount: parseInt(row.followers_count) || 0,
          postsCount: parseInt(row.posts_count) || 0,
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accounts),
        };
      } catch (error) {
        console.error('Error fetching suggested accounts:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to fetch suggested accounts' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
