import { Router } from 'express';
import { pool } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import {
  checkMessageRateLimit,
  sanitizeMessageContent,
  validateMessageContent,
  validateRecipientExists,
  isValidUUID,
  messageSecurityHeaders,
} from '../utils/message-security';

const router = Router();

// Input validation schemas
const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
}).refine(
  (data) => data.conversationId || data.recipientId,
  { message: 'Either conversationId or recipientId must be provided' }
);

const ConversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

// Middleware to add security headers
router.use((req, res, next) => {
  Object.entries(messageSecurityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// Get all conversations for the authenticated user
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const accountId = req.accountId;

    const result = await pool.query(
      `SELECT DISTINCT ON (c.id)
        c.id,
        c.created_at,
        c.updated_at,
        other_participant.account_id as other_user_id,
        a.email as other_user_email,
        a.name as other_user_name,
        a.username as other_user_username,
        a.avatar_url as other_user_avatar,
        a.is_verified as other_user_is_verified,
        m.content as last_message,
        m.created_at as last_message_time,
        (
          SELECT COUNT(*)
          FROM messages msg
          LEFT JOIN message_reads mr ON msg.id = mr.message_id AND mr.account_id = $1
          WHERE msg.conversation_id = c.id
          AND msg.sender_id != $1
          AND mr.id IS NULL
        ) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants my_participant
        ON c.id = my_participant.conversation_id
        AND my_participant.account_id = $1
        AND my_participant.left_at IS NULL
      INNER JOIN conversation_participants other_participant
        ON c.id = other_participant.conversation_id
        AND other_participant.account_id != $1
        AND other_participant.left_at IS NULL
      LEFT JOIN accounts a ON other_participant.account_id = a.id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.is_group = FALSE
      ORDER BY c.id, COALESCE(m.created_at, c.created_at) DESC`,
      [accountId]
    );

    const conversations = result.rows.map(row => ({
      id: row.id,
      otherUser: {
        id: row.other_user_id,
        email: row.other_user_email,
        name: row.other_user_name || row.other_user_username || row.other_user_email,
        username: row.other_user_username,
        avatar: row.other_user_avatar || '/BestAdsUp.jpg',
        isVerified: row.other_user_is_verified || false,
      },
      lastMessage: row.last_message,
      lastMessageTime: row.last_message_time,
      unreadCount: parseInt(row.unread_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(conversations);
  } catch (error: any) {
    // Sanitized error logging
    console.error('Error fetching conversations:', {
      message: error.message,
      code: error.code,
    });
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation
router.get('/:conversationId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.params;
    const accountId = req.accountId;

    // Validate UUID format
    if (!isValidUUID(conversationId)) {
      res.status(400).json({ message: 'Invalid conversation ID format' });
      return;
    }

    // Verify user is part of the conversation
    const convCheck = await pool.query(
      `SELECT cp.id
       FROM conversation_participants cp
       WHERE cp.conversation_id = $1
       AND cp.account_id = $2
       AND cp.left_at IS NULL`,
      [conversationId, accountId]
    );

    if (convCheck.rows.length === 0) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Mark messages as read (insert into message_reads for unread messages)
    await pool.query(
      `INSERT INTO message_reads (message_id, account_id)
       SELECT m.id, $2
       FROM messages m
       LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.account_id = $2
       WHERE m.conversation_id = $1
       AND m.sender_id != $2
       AND mr.id IS NULL
       ON CONFLICT (message_id, account_id) DO NOTHING`,
      [conversationId, accountId]
    );

    const result = await pool.query(
      `SELECT
        m.id,
        m.content,
        m.created_at,
        m.sender_id,
        a.email as sender_email,
        a.name as sender_name,
        a.avatar_url as sender_avatar,
        a.is_verified as sender_is_verified,
        a.username as sender_username,
        (mr.id IS NOT NULL) as is_read
      FROM messages m
      JOIN accounts a ON m.sender_id = a.id
      LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.account_id = $2
      WHERE m.conversation_id = $1
      AND m.deleted_at IS NULL
      ORDER BY m.created_at ASC`,
      [conversationId, accountId]
    );

    const messages = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      isRead: row.is_read,
      isMine: row.sender_id === accountId,
      sender: {
        id: row.sender_id,
        email: row.sender_email,
        name: row.sender_name || row.sender_username || row.sender_email,
        username: row.sender_username,
        avatar: row.sender_avatar || '/BestAdsUp.jpg',
        isVerified: row.sender_is_verified || false,
      },
    }));

    res.json(messages);
  } catch (error: any) {
    // Sanitized error logging
    console.error('Error fetching messages:', {
      message: error.message,
      code: error.code,
    });
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const senderId = req.accountId!;

    // Check rate limit
    const rateLimitResult = checkMessageRateLimit(senderId);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        message: 'Too many messages sent. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    // Validate input with Zod
    const validationResult = SendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid input',
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { conversationId, content, recipientId } = validationResult.data;

    // Validate message content
    const contentValidation = validateMessageContent(content);
    if (!contentValidation.valid) {
      return res.status(400).json({ message: contentValidation.error });
    }

    // Sanitize content for XSS protection
    const sanitizedContent = sanitizeMessageContent(content);

    let finalConversationId = conversationId;

    // If no conversation ID, create a new conversation
    if (!conversationId && recipientId) {
      // Validate recipient exists
      const recipientExists = await validateRecipientExists(pool, recipientId);
      if (!recipientExists) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      // Check if conversation already exists between these two users
      const existingConv = await pool.query(
        `SELECT c.id
         FROM conversations c
         INNER JOIN conversation_participants cp1
           ON c.id = cp1.conversation_id
           AND cp1.account_id = $1
           AND cp1.left_at IS NULL
         INNER JOIN conversation_participants cp2
           ON c.id = cp2.conversation_id
           AND cp2.account_id = $2
           AND cp2.left_at IS NULL
         WHERE c.is_group = FALSE
         LIMIT 1`,
        [senderId, recipientId]
      );

      if (existingConv.rows.length > 0) {
        finalConversationId = existingConv.rows[0].id;
      } else {
        // Create new conversation and add participants
        const newConv = await pool.query(
          `INSERT INTO conversations (is_group, created_by)
           VALUES (FALSE, $1)
           RETURNING id`,
          [senderId]
        );
        finalConversationId = newConv.rows[0].id;

        // Add both participants
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, account_id)
           VALUES ($1, $2), ($1, $3)`,
          [finalConversationId, senderId, recipientId]
        );
      }
    }

    if (!finalConversationId) {
      res.status(400).json({ message: 'Conversation ID or recipient ID required' });
      return;
    }

    // Verify user is part of the conversation
    const convCheck = await pool.query(
      `SELECT cp.id
       FROM conversation_participants cp
       WHERE cp.conversation_id = $1
       AND cp.account_id = $2
       AND cp.left_at IS NULL`,
      [finalConversationId, senderId]
    );

    if (convCheck.rows.length === 0) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Insert message with sanitized content
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, sender_id`,
      [finalConversationId, senderId, sanitizedContent]
    );

    const message = result.rows[0];
    const senderInfo = await pool.query(
      'SELECT email, name, avatar_url FROM accounts WHERE id = $1',
      [senderId]
    );

    const sender = senderInfo.rows[0];

    res.json({
      id: message.id,
      content: message.content,
      createdAt: message.created_at,
      isMine: true,
      sender: {
        id: message.sender_id,
        email: sender.email,
        name: sender.name || sender.email,
        avatar: sender.avatar_url || '/BestAdsUp.jpg',
      },
    });
  } catch (error: any) {
    // Sanitized error logging
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid input',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    console.error('Error sending message:', {
      message: error.message,
      code: error.code,
    });
    res.status(500).json({ message: 'Failed to send message' });
  }
});

export default router;
