import { Router } from 'express';
import { pool } from '../index';

const router = Router();

// GET /tags/trending - Get trending tags
router.get('/trending', async (req, res) => {
  try {
    const { limit = 15 } = req.query;

    const result = await pool.query(
      `SELECT
        t.id,
        t.name,
        t.use_count,
        COUNT(DISTINCT pt.post_id) as post_count
      FROM tags t
      LEFT JOIN post_tags pt ON t.id = pt.tag_id
      GROUP BY t.id, t.name, t.use_count
      HAVING COUNT(DISTINCT pt.post_id) > 0
      ORDER BY t.use_count DESC, post_count DESC
      LIMIT $1`,
      [Number(limit)]
    );

    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      useCount: Number(row.use_count),
      postCount: Number(row.post_count),
    }));

    res.json(tags);
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    res.status(500).json({ message: 'Failed to fetch trending tags' });
  }
});

// GET /tags/search - Search tags
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Query parameter "q" is required' });
    }

    const searchTerm = String(q).toLowerCase().replace(/^#/, '');

    const result = await pool.query(
      `SELECT
        t.id,
        t.name,
        t.use_count,
        COUNT(DISTINCT pt.post_id) as post_count
      FROM tags t
      LEFT JOIN post_tags pt ON t.id = pt.tag_id
      WHERE t.normalized_name LIKE $1
      GROUP BY t.id, t.name, t.use_count
      ORDER BY t.use_count DESC
      LIMIT $2`,
      [`%${searchTerm}%`, Number(limit)]
    );

    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      useCount: Number(row.use_count),
      postCount: Number(row.post_count),
    }));

    res.json(tags);
  } catch (error) {
    console.error('Error searching tags:', error);
    res.status(500).json({ message: 'Failed to search tags' });
  }
});

export default router;
