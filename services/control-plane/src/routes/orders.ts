import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOrderSchema = z.object({
  service_id: z.string().uuid(),
  selected_tier_name: z.string().optional(),
  selected_tier_price: z.number().positive().optional(),
  buyer_requirements: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending_payment',
    'paid',
    'in_progress',
    'delivered',
    'completed',
    'cancelled',
    'disputed',
    'refunded',
  ]),
});

const createMessageSchema = z.object({
  message: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

const createDeliverableSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  file_name: z.string().min(1).max(255),
  file_url: z.string().url(),
  file_size: z.number().positive(),
  file_type: z.string(),
  revision_number: z.number().int().positive().optional(),
});

const updateDeliverableSchema = z.object({
  status: z.enum(['pending_review', 'approved', 'revision_requested', 'rejected']),
  rejection_reason: z.string().optional(),
});

const createRevisionRequestSchema = z.object({
  description: z.string().min(1),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createTimelineEvent(
  orderId: string,
  actorId: string | null,
  eventType: string,
  eventTitle: string,
  eventDescription: string | null = null,
  metadata: any = {}
) {
  await pool.query(
    `INSERT INTO order_timeline (order_id, actor_id, event_type, event_title, event_description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderId, actorId, eventType, eventTitle, eventDescription, JSON.stringify(metadata)]
  );
}

async function createSystemMessage(orderId: string, message: string) {
  await pool.query(
    `INSERT INTO project_messages (order_id, sender_id, message, is_system_message)
     VALUES ($1, (SELECT buyer_id FROM orders WHERE id = $1), $2, TRUE)`,
    [orderId, message]
  );
}

function calculatePlatformFee(price: number): { platformFee: number; creatorEarnings: number } {
  const platformFee = Math.round(price * 0.10 * 100) / 100; // 10% platform fee
  const creatorEarnings = Math.round((price - platformFee) * 100) / 100;
  return { platformFee, creatorEarnings };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /orders
 * Get all orders for the authenticated user (buyer or creator)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const accountId = req.accountId!;
    const { status, role } = req.query;

    let query = `
      SELECT
        o.*,
        s.name as service_name_current,
        s.image_url as service_image,
        buyer.name as buyer_name,
        buyer.email as buyer_email,
        buyer.avatar_url as buyer_avatar,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.avatar_url as creator_avatar,
        (SELECT COUNT(*)::int FROM project_messages WHERE order_id = o.id AND is_read = FALSE) as unread_messages
      FROM orders o
      LEFT JOIN products s ON o.service_id = s.id
      LEFT JOIN accounts buyer ON o.buyer_id = buyer.id
      LEFT JOIN accounts creator ON o.creator_id = creator.id
      WHERE (o.buyer_id = $1 OR o.creator_id = $1)
    `;

    const params: any[] = [accountId];

    if (status) {
      query += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    if (role === 'buyer') {
      query += ` AND o.buyer_id = $1`;
    } else if (role === 'creator') {
      query += ` AND o.creator_id = $1`;
    }

    query += ` ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

/**
 * GET /orders/:id
 * Get a single order by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;

    const result = await pool.query(
      `SELECT
        o.*,
        s.name as service_name_current,
        s.image_url as service_image,
        s.delivery_time_days as service_delivery_time,
        s.revisions_included as service_revisions_included,
        buyer.id as buyer_id,
        buyer.name as buyer_name,
        buyer.email as buyer_email,
        buyer.avatar_url as buyer_avatar,
        creator.id as creator_id,
        creator.name as creator_name,
        creator.email as creator_email,
        creator.avatar_url as creator_avatar,
        creator.verification_level,
        creator.verification_score
      FROM orders o
      LEFT JOIN products s ON o.service_id = s.id
      LEFT JOIN accounts buyer ON o.buyer_id = buyer.id
      LEFT JOIN accounts creator ON o.creator_id = creator.id
      WHERE o.id = $1 AND (o.buyer_id = $2 OR o.creator_id = $2)`,
      [id, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

/**
 * POST /orders
 * Create a new order
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const accountId = req.accountId!;
    const validatedData = createOrderSchema.parse(req.body);

    // Get service details
    const serviceResult = await pool.query(
      `SELECT * FROM products WHERE id = $1 AND is_active = TRUE`,
      [validatedData.service_id]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    const service = serviceResult.rows[0];

    // Determine price (from tier or base price)
    const price = validatedData.selected_tier_price || service.price;
    const { platformFee, creatorEarnings } = calculatePlatformFee(price);

    // Generate order number
    const orderNumberResult = await pool.query('SELECT generate_order_number() as number');
    const orderNumber = orderNumberResult.rows[0].number;

    // Calculate expected delivery date
    const deliveryDays = service.delivery_time_days || 7;
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + deliveryDays);

    // Create order
    const result = await pool.query(
      `INSERT INTO orders (
        buyer_id, creator_id, service_id, order_number,
        service_name, service_description, price, currency,
        platform_fee, creator_earnings, selected_tier_name,
        selected_tier_price, delivery_time_days, expected_delivery_date,
        buyer_requirements, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        accountId,
        service.creator_id,
        service.id,
        orderNumber,
        service.name,
        service.description,
        price,
        service.currency || 'USD',
        platformFee,
        creatorEarnings,
        validatedData.selected_tier_name || null,
        validatedData.selected_tier_price || null,
        deliveryDays,
        expectedDeliveryDate,
        validatedData.buyer_requirements || null,
        'pending_payment',
      ]
    );

    const order = result.rows[0];

    // Create timeline event
    await createTimelineEvent(
      order.id,
      accountId,
      'order_created',
      'Order created',
      `Order ${orderNumber} was created`
    );

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

/**
 * PATCH /orders/:id/status
 * Update order status
 */
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;
    const validatedData = updateOrderStatusSchema.parse(req.body);

    // Get current order
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [id, accountId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const oldStatus = order.status;

    // Update status
    const updateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [validatedData.status];

    // Set timestamps based on status
    if (validatedData.status === 'paid') {
      updateFields.push('paid_at = CURRENT_TIMESTAMP');
    } else if (validatedData.status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    } else if (validatedData.status === 'completed') {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    } else if (validatedData.status === 'cancelled') {
      updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
    }

    const result = await pool.query(
      `UPDATE orders SET ${updateFields.join(', ')}
       WHERE id = $${params.length + 1}
       RETURNING *`,
      [...params, id]
    );

    // Create timeline event
    await createTimelineEvent(
      id,
      accountId,
      'status_changed',
      `Order status changed`,
      `Status changed from ${oldStatus} to ${validatedData.status}`,
      { old_status: oldStatus, new_status: validatedData.status }
    );

    // Create system message
    await createSystemMessage(id, `Order status changed to ${validatedData.status}`);

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

/**
 * GET /orders/:id/messages
 * Get all messages for an order
 */
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;

    // Verify user has access to this order
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [id, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await pool.query(
      `SELECT
        m.*,
        a.name as sender_name,
        a.avatar_url as sender_avatar
      FROM project_messages m
      LEFT JOIN accounts a ON m.sender_id = a.id
      WHERE m.order_id = $1
      ORDER BY m.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

/**
 * POST /orders/:id/messages
 * Send a message in an order
 */
router.post('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;
    const validatedData = createMessageSchema.parse(req.body);

    // Verify user has access to this order
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [id, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await pool.query(
      `INSERT INTO project_messages (order_id, sender_id, message, attachments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, accountId, validatedData.message, JSON.stringify(validatedData.attachments || [])]
    );

    // Create timeline event
    await createTimelineEvent(
      id,
      accountId,
      'message_sent',
      'Message sent',
      validatedData.message.substring(0, 100)
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

/**
 * GET /orders/:id/deliverables
 * Get all deliverables for an order
 */
router.get('/:id/deliverables', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;

    // Verify user has access to this order
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [id, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await pool.query(
      `SELECT
        d.*,
        uploader.name as uploader_name,
        uploader.avatar_url as uploader_avatar,
        approver.name as approver_name
      FROM deliverables d
      LEFT JOIN accounts uploader ON d.uploaded_by = uploader.id
      LEFT JOIN accounts approver ON d.approved_by = approver.id
      WHERE d.order_id = $1
      ORDER BY d.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deliverables:', error);
    res.status(500).json({ message: 'Failed to fetch deliverables' });
  }
});

/**
 * POST /orders/:id/deliverables
 * Upload a deliverable
 */
router.post('/:id/deliverables', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;
    const validatedData = createDeliverableSchema.parse(req.body);

    // Verify user is the creator of this order
    const orderCheck = await pool.query(
      `SELECT id, creator_id FROM orders WHERE id = $1 AND creator_id = $2`,
      [id, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only the creator can upload deliverables' });
    }

    const result = await pool.query(
      `INSERT INTO deliverables (
        order_id, uploaded_by, title, description,
        file_name, file_url, file_size, file_type, revision_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        accountId,
        validatedData.title,
        validatedData.description || null,
        validatedData.file_name,
        validatedData.file_url,
        validatedData.file_size,
        validatedData.file_type,
        validatedData.revision_number || 1,
      ]
    );

    // Create timeline event
    await createTimelineEvent(
      id,
      accountId,
      'deliverable_uploaded',
      'Deliverable uploaded',
      `${validatedData.title} was uploaded`
    );

    // Create system message
    await createSystemMessage(id, `New deliverable uploaded: ${validatedData.title}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error uploading deliverable:', error);
    res.status(500).json({ message: 'Failed to upload deliverable' });
  }
});

/**
 * PATCH /orders/:orderId/deliverables/:deliverableId
 * Update deliverable status (approve/reject)
 */
router.patch('/:orderId/deliverables/:deliverableId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, deliverableId } = req.params;
    const accountId = req.accountId!;
    const validatedData = updateDeliverableSchema.parse(req.body);

    // Verify user is the buyer of this order
    const orderCheck = await pool.query(
      `SELECT id, buyer_id FROM orders WHERE id = $1 AND buyer_id = $2`,
      [orderId, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only the buyer can approve/reject deliverables' });
    }

    const updateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [validatedData.status];

    if (validatedData.status === 'approved') {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`, `approved_by = $${params.length + 1}`);
      params.push(accountId);
    } else if (validatedData.status === 'rejected') {
      updateFields.push(
        `rejected_at = CURRENT_TIMESTAMP`,
        `rejection_reason = $${params.length + 1}`
      );
      params.push(validatedData.rejection_reason || 'No reason provided');
    }

    const result = await pool.query(
      `UPDATE deliverables SET ${updateFields.join(', ')}
       WHERE id = $${params.length + 1} AND order_id = $${params.length + 2}
       RETURNING *`,
      [...params, deliverableId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }

    // Create timeline event
    await createTimelineEvent(
      orderId,
      accountId,
      'deliverable_reviewed',
      `Deliverable ${validatedData.status}`,
      result.rows[0].title
    );

    // Create system message
    await createSystemMessage(
      orderId,
      `Deliverable ${result.rows[0].title} was ${validatedData.status}`
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating deliverable:', error);
    res.status(500).json({ message: 'Failed to update deliverable' });
  }
});

/**
 * GET /orders/:id/timeline
 * Get order timeline/history
 */
router.get('/:id/timeline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;

    // Verify user has access to this order
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND (buyer_id = $2 OR creator_id = $2)`,
      [id, accountId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await pool.query(
      `SELECT
        t.*,
        a.name as actor_name,
        a.avatar_url as actor_avatar
      FROM order_timeline t
      LEFT JOIN accounts a ON t.actor_id = a.id
      WHERE t.order_id = $1
      ORDER BY t.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ message: 'Failed to fetch timeline' });
  }
});

/**
 * POST /orders/:id/revisions
 * Request a revision
 */
router.post('/:id/revisions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.accountId!;
    const validatedData = createRevisionRequestSchema.parse(req.body);

    // Verify user is the buyer
    const orderResult = await pool.query(
      `SELECT id, buyer_id, service_id FROM orders WHERE id = $1 AND buyer_id = $2`,
      [id, accountId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(403).json({ message: 'Only the buyer can request revisions' });
    }

    // Get current revision count
    const revisionCountResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM order_revisions WHERE order_id = $1`,
      [id]
    );

    const revisionNumber = revisionCountResult.rows[0].count + 1;

    // Create revision request
    const result = await pool.query(
      `INSERT INTO order_revisions (order_id, requested_by, revision_number, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, accountId, revisionNumber, validatedData.description]
    );

    // Create timeline event
    await createTimelineEvent(
      id,
      accountId,
      'revision_requested',
      `Revision #${revisionNumber} requested`,
      validatedData.description
    );

    // Create system message
    await createSystemMessage(id, `Revision #${revisionNumber} requested: ${validatedData.description}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating revision request:', error);
    res.status(500).json({ message: 'Failed to create revision request' });
  }
});

export default router;
