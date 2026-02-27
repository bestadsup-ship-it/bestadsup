import type { Handler, HandlerEvent } from '@netlify/functions';
import { Pool } from 'pg';
import { withAuth } from './utils/auth';

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

  const path = event.path.replace('/.netlify/functions/cart', '');
  const segments = path.split('/').filter(Boolean);

  try {
    // GET /cart - Get current user's cart
    if (event.httpMethod === 'GET' && segments.length === 0) {
      return withAuth(async (event, { accountId }) => {
        const result = await pool.query(
          `SELECT
            ci.id, ci.quantity, ci.created_at, ci.updated_at,
            p.id as product_id, p.name as product_name, p.description as product_description,
            p.price as product_price, p.image_url as product_image_url,
            p.category as product_category, p.stock_quantity as product_stock_quantity
          FROM cart_items ci
          JOIN products p ON ci.product_id = p.id
          WHERE ci.account_id = $1 AND p.is_active = TRUE
          ORDER BY ci.created_at DESC`,
          [accountId]
        );

        const cartItems = result.rows.map(row => ({
          id: row.id,
          quantity: row.quantity,
          product: {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            price: parseFloat(row.product_price),
            imageUrl: row.product_image_url,
            category: row.product_category,
            stockQuantity: row.product_stock_quantity,
          },
          subtotal: parseFloat(row.product_price) * row.quantity,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            items: cartItems,
            total,
            itemCount: cartItems.length,
          }),
        };
      })(event);
    }

    // POST /cart - Add item to cart
    if (event.httpMethod === 'POST' && segments.length === 0) {
      return withAuth(async (event, { accountId }) => {
        const { productId, quantity = 1 } = JSON.parse(event.body || '{}');

        if (!productId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Product ID is required' }),
          };
        }

        if (quantity < 1) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Quantity must be at least 1' }),
          };
        }

        // Check if product exists and is active
        const productResult = await pool.query(
          'SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = TRUE',
          [productId]
        );

        if (productResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Product not found or unavailable' }),
          };
        }

        const product = productResult.rows[0];

        if (quantity > product.stock_quantity) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Insufficient stock', availableStock: product.stock_quantity }),
          };
        }

        // Add or update cart item
        const result = await pool.query(
          `INSERT INTO cart_items (account_id, product_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (account_id, product_id)
          DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()
          RETURNING id, quantity, created_at, updated_at`,
          [accountId, productId, quantity]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            id: result.rows[0].id,
            productId,
            quantity: result.rows[0].quantity,
            createdAt: result.rows[0].created_at,
            updatedAt: result.rows[0].updated_at,
          }),
        };
      })(event);
    }

    // PUT /cart/:itemId - Update cart item quantity
    if (event.httpMethod === 'PUT' && segments.length === 1) {
      return withAuth(async (event, { accountId }) => {
        const itemId = segments[0];
        const { quantity } = JSON.parse(event.body || '{}');

        if (!quantity || quantity < 1) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Valid quantity is required' }),
          };
        }

        // Check stock availability
        const stockCheck = await pool.query(
          `SELECT p.stock_quantity
          FROM cart_items ci
          JOIN products p ON ci.product_id = p.id
          WHERE ci.id = $1 AND ci.account_id = $2`,
          [itemId, accountId]
        );

        if (stockCheck.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Cart item not found' }),
          };
        }

        if (quantity > stockCheck.rows[0].stock_quantity) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Insufficient stock',
              availableStock: stockCheck.rows[0].stock_quantity,
            }),
          };
        }

        const result = await pool.query(
          `UPDATE cart_items
          SET quantity = $1, updated_at = NOW()
          WHERE id = $2 AND account_id = $3
          RETURNING id, quantity, updated_at`,
          [quantity, itemId, accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Cart item not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0]),
        };
      })(event);
    }

    // DELETE /cart/:itemId - Remove item from cart
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      return withAuth(async (event, { accountId }) => {
        const itemId = segments[0];

        const result = await pool.query(
          'DELETE FROM cart_items WHERE id = $1 AND account_id = $2 RETURNING id',
          [itemId, accountId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Cart item not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Item removed from cart' }),
        };
      })(event);
    }

    // DELETE /cart - Clear entire cart
    if (event.httpMethod === 'DELETE' && segments.length === 0) {
      return withAuth(async (event, { accountId }) => {
        await pool.query(
          'DELETE FROM cart_items WHERE account_id = $1',
          [accountId]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Cart cleared' }),
        };
      })(event);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error: any) {
    console.error('Cart API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

export { handler };
