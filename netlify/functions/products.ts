import type { Handler, HandlerEvent } from '@netlify/functions';
import { Pool } from 'pg';
import { withAuth, withAdminAuth } from './utils/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const handler: Handler = async (event: HandlerEvent) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  const path = event.path.replace('/.netlify/functions/products', '');
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /products - Get all products (optional category filter)
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const category = event.queryStringParameters?.category;
      const includeInactive = event.queryStringParameters?.includeInactive === 'true';

      let query = `
        SELECT
          id, name, description, price, image_url, category,
          stock_quantity, is_active, metadata, created_at, updated_at
        FROM products
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      if (!includeInactive) {
        conditions.push('is_active = TRUE');
      }

      if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      const products = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        imageUrl: row.image_url,
        category: row.category,
        stockQuantity: row.stock_quantity,
        isActive: row.is_active,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(products),
      };
    }

    // GET /products/:id - Get single product
    if (event.httpMethod === 'GET' && segments.length === 1) {
      const productId = segments[0];

      const result = await pool.query(
        `SELECT
          id, name, description, price, image_url, category,
          stock_quantity, is_active, metadata, created_at, updated_at
        FROM products
        WHERE id = $1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' }),
        };
      }

      const row = result.rows[0];
      const product = {
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        imageUrl: row.image_url,
        category: row.category,
        stockQuantity: row.stock_quantity,
        isActive: row.is_active,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(product),
      };
    }

    // GET /products/categories - Get all unique categories
    if (event.httpMethod === 'GET' && segments[0] === 'categories') {
      const result = await pool.query(
        `SELECT DISTINCT category
        FROM products
        WHERE is_active = TRUE
        ORDER BY category`
      );

      const categories = result.rows.map(row => row.category);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categories),
      };
    }

    // POST /products - Create new product (admin only)
    if (event.httpMethod === 'POST' && segments.length === 0) {
      return withAdminAuth(async (event, { accountId }) => {
        const { name, description, price, imageUrl, category, stockQuantity, metadata } = JSON.parse(event.body || '{}');

        if (!name || !price || !category) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Name, price, and category are required' }),
          };
        }

        const result = await pool.query(
          `INSERT INTO products (name, description, price, image_url, category, stock_quantity, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, description, price, image_url, category, stock_quantity, is_active, metadata, created_at, updated_at`,
          [name, description || null, price, imageUrl || null, category, stockQuantity || 0, metadata || {}]
        );

        const row = result.rows[0];
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            imageUrl: row.image_url,
            category: row.category,
            stockQuantity: row.stock_quantity,
            isActive: row.is_active,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
        };
      })(event);
    }

    // PUT /products/:id - Update product (admin only)
    if (event.httpMethod === 'PUT' && segments.length === 1) {
      return withAdminAuth(async (event, { accountId }) => {
        const productId = segments[0];
        const { name, description, price, imageUrl, category, stockQuantity, isActive, metadata } = JSON.parse(event.body || '{}');

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(name);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramCount++}`);
          values.push(description);
        }
        if (price !== undefined) {
          updates.push(`price = $${paramCount++}`);
          values.push(price);
        }
        if (imageUrl !== undefined) {
          updates.push(`image_url = $${paramCount++}`);
          values.push(imageUrl);
        }
        if (category !== undefined) {
          updates.push(`category = $${paramCount++}`);
          values.push(category);
        }
        if (stockQuantity !== undefined) {
          updates.push(`stock_quantity = $${paramCount++}`);
          values.push(stockQuantity);
        }
        if (isActive !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(isActive);
        }
        if (metadata !== undefined) {
          updates.push(`metadata = $${paramCount++}`);
          values.push(metadata);
        }

        if (updates.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No fields to update' }),
          };
        }

        values.push(productId);
        const result = await pool.query(
          `UPDATE products SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
          RETURNING id, name, description, price, image_url, category, stock_quantity, is_active, metadata, created_at, updated_at`,
          values
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' }),
          };
        }

        const row = result.rows[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            imageUrl: row.image_url,
            category: row.category,
            stockQuantity: row.stock_quantity,
            isActive: row.is_active,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
        };
      })(event);
    }

    // DELETE /products/:id - Delete product (admin only)
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      return withAdminAuth(async (event, { accountId }) => {
        const productId = segments[0];

        const result = await pool.query(
          'DELETE FROM products WHERE id = $1 RETURNING id',
          [productId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Product deleted successfully' }),
        };
      })(event);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error: any) {
    console.error('Products API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

export { handler };
