import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../index';

const router = Router();

// GET /cart - Get current user's cart
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

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

    res.json({
      items: cartItems,
      total,
      itemCount: cartItems.length,
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /cart - Add item to cart
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({ error: 'Quantity must be at least 1' });
      return;
    }

    // Check if product exists and is active
    const productResult = await pool.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found or unavailable' });
      return;
    }

    const product = productResult.rows[0];

    if (quantity > product.stock_quantity) {
      res.status(400).json({
        error: 'Insufficient stock',
        availableStock: product.stock_quantity
      });
      return;
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

    res.json({
      id: result.rows[0].id,
      productId,
      quantity: result.rows[0].quantity,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PUT /cart/:itemId - Update cart item quantity
router.put('/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      res.status(400).json({ error: 'Valid quantity is required' });
      return;
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
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    if (quantity > stockCheck.rows[0].stock_quantity) {
      res.status(400).json({
        error: 'Insufficient stock',
        availableStock: stockCheck.rows[0].stock_quantity,
      });
      return;
    }

    const result = await pool.query(
      `UPDATE cart_items
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND account_id = $3
      RETURNING id, quantity, updated_at`,
      [quantity, itemId, accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /cart/:itemId - Remove item from cart
router.delete('/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;
    const { itemId } = req.params;

    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND account_id = $2 RETURNING id',
      [itemId, accountId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// DELETE /cart - Clear entire cart
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    await pool.query(
      'DELETE FROM cart_items WHERE account_id = $1',
      [accountId]
    );

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export { router as cartRouter };
