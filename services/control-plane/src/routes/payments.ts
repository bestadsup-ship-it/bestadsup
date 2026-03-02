import express, { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate } from '../middleware/auth';
import { stripe, calculatePaymentAmounts } from '../config/stripe';

const router = express.Router();

// Validation schemas
const createPaymentIntentSchema = z.object({
  order_id: z.string().uuid(),
});

const confirmPaymentSchema = z.object({
  payment_intent_id: z.string(),
});

// ============================================================================
// CREATE PAYMENT INTENT
// ============================================================================
// Creates a Stripe payment intent for an order
router.post('/create-payment-intent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = createPaymentIntentSchema.parse(req.body);

    // Get order details
    const orderResult = await pool.query(
      `SELECT o.*, s.name as service_name, s.description as service_description
       FROM orders o
       JOIN products s ON o.service_id = s.id
       WHERE o.id = $1 AND o.buyer_id = $2`,
      [validatedData.order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found or unauthorized' });
    }

    const order = orderResult.rows[0];

    // Check if order is already paid
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ message: 'Order is not pending payment' });
    }

    // Calculate payment amounts
    const amounts = calculatePaymentAmounts(order.price);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amounts.totalAmount,
      currency: order.currency?.toLowerCase() || 'usd',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        buyer_id: order.buyer_id,
        creator_id: order.creator_id,
        platform_fee: amounts.platformFee.toString(),
        creator_earnings: amounts.creatorEarnings.toString(),
      },
      description: `Order ${order.order_number}: ${order.service_name}`,
    });

    // Update order with payment intent ID
    await pool.query(
      `UPDATE orders
       SET payment_intent_id = $1, payment_status = 'processing'
       WHERE id = $2`,
      [paymentIntent.id, order.id]
    );

    // Create timeline event
    await pool.query(
      `INSERT INTO order_timeline (order_id, actor_id, event_type, event_title, event_description)
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, userId, 'payment_initiated', 'Payment initiated', 'Buyer started the payment process']
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }

    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// ============================================================================
// CONFIRM PAYMENT
// ============================================================================
// Called after successful payment to update order status
router.post('/confirm-payment', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = confirmPaymentSchema.parse(req.body);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(validatedData.payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment has not succeeded' });
    }

    // Get order
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE payment_intent_id = $1 AND buyer_id = $2`,
      [validatedData.payment_intent_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Update order status to paid
    const deliveryDays = order.delivery_time_days || 7;
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + deliveryDays);

    await pool.query(
      `UPDATE orders
       SET status = 'paid',
           payment_status = 'paid',
           paid_at = CURRENT_TIMESTAMP,
           expected_delivery_date = $1
       WHERE id = $2`,
      [expectedDeliveryDate, order.id]
    );

    // Create timeline event
    await pool.query(
      `INSERT INTO order_timeline (order_id, actor_id, event_type, event_title, event_description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        order.id,
        userId,
        'payment_received',
        'Payment received',
        `Payment of $${order.price} received successfully`,
        JSON.stringify({ payment_intent_id: paymentIntent.id })
      ]
    );

    // Create system message
    await pool.query(
      `INSERT INTO project_messages (order_id, sender_id, message, is_system_message)
       VALUES ($1, $2, $3, TRUE)`,
      [order.id, userId, 'Payment received. The creator can now start working on your order.']
    );

    // Notify creator (system message)
    await pool.query(
      `INSERT INTO project_messages (order_id, sender_id, message, is_system_message)
       VALUES ($1, $2, $3, TRUE)`,
      [order.id, order.creator_id, 'New order received! Payment confirmed. You can start working on this project.']
    );

    res.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      status: 'paid'
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }

    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================
// Handles Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ message: 'Missing stripe-signature header' });
  }

  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Warning: STRIPE_WEBHOOK_SECRET not set');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);

        // Update order status
        const orderId = paymentIntent.metadata.order_id;
        if (orderId) {
          const deliveryDays = 7; // Default
          const expectedDeliveryDate = new Date();
          expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + deliveryDays);

          await pool.query(
            `UPDATE orders
             SET status = 'paid',
                 payment_status = 'paid',
                 paid_at = CURRENT_TIMESTAMP,
                 expected_delivery_date = $1
             WHERE id = $2 AND status = 'pending_payment'`,
            [expectedDeliveryDate, orderId]
          );

          // Create timeline event
          await pool.query(
            `INSERT INTO order_timeline (order_id, event_type, event_title, event_description, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              orderId,
              'payment_received',
              'Payment received (webhook)',
              `Payment confirmed via webhook`,
              JSON.stringify({ payment_intent_id: paymentIntent.id })
            ]
          );
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);

        const failedOrderId = failedPayment.metadata.order_id;
        if (failedOrderId) {
          await pool.query(
            `UPDATE orders
             SET payment_status = 'failed'
             WHERE id = $1`,
            [failedOrderId]
          );

          await pool.query(
            `INSERT INTO order_timeline (order_id, event_type, event_title, event_description)
             VALUES ($1, $2, $3, $4)`,
            [failedOrderId, 'payment_failed', 'Payment failed', 'Payment attempt failed']
          );
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// ============================================================================
// GET PAYMENT STATUS
// ============================================================================
// Check payment status for an order
router.get('/status/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { orderId } = req.params;

    const result = await pool.query(
      `SELECT payment_intent_id, payment_status, status, paid_at
       FROM orders
       WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = result.rows[0];

    // If there's a payment intent, get its status from Stripe
    let stripeStatus = null;
    if (order.payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent_id);
        stripeStatus = paymentIntent.status;
      } catch (error) {
        console.error('Error fetching payment intent:', error);
      }
    }

    res.json({
      payment_status: order.payment_status,
      order_status: order.status,
      paid_at: order.paid_at,
      stripe_status: stripeStatus,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ message: 'Failed to fetch payment status' });
  }
});

export default router;
