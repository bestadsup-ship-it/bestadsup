import { Handler } from '@netlify/functions';
import { getPool } from './utils/db';
import { withAuth } from './utils/auth';
import {
  checkMessageRateLimit,
  sanitizeMessageContent,
  validateMessageContent,
  validateRecipientExists,
  isValidUUID,
  messageSecurityHeaders,
} from './utils/message-security';

export const handler: Handler = async (event) => {
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/messages', '');
  const segments = path.split('/').filter(Boolean);

  // GET /messages/conversations - Get all conversations for current user
  if (event.httpMethod === 'GET' && segments[0] === 'conversations') {
    return withAuth(async (event, { accountId }) => {
      try {
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
            name: row.other_user_name || row.other_user_username || row.other_user_email,
            username: row.other_user_username,
            email: row.other_user_email,
            avatar: row.other_user_avatar || '/BestAdsUp.jpg',
            isVerified: row.other_user_is_verified || false,
          },
          lastMessage: row.last_message,
          lastMessageTime: row.last_message_time,
          unreadCount: parseInt(row.unread_count) || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          statusCode: 200,
          headers: messageSecurityHeaders,
          body: JSON.stringify(conversations),
        };
      } catch (error: any) {
        console.error('Error fetching conversations:', {
          message: error.message,
          code: error.code,
        });
        return {
          statusCode: 500,
          headers: messageSecurityHeaders,
          body: JSON.stringify({ message: 'Failed to fetch conversations' }),
        };
      }
    })(event);
  }

  // GET /messages/:conversationId - Get messages for a specific conversation
  if (event.httpMethod === 'GET' && segments.length === 1 && segments[0] !== 'conversations') {
    return withAuth(async (event, { accountId }) => {
      try {
        const conversationId = segments[0];

        // Validate UUID format
        if (!isValidUUID(conversationId)) {
          return {
            statusCode: 400,
            headers: messageSecurityHeaders,
            body: JSON.stringify({ message: 'Invalid conversation ID format' }),
          };
        }

        // Verify user is part of this conversation
        const convCheck = await pool.query(
          `SELECT cp.id
           FROM conversation_participants cp
           WHERE cp.conversation_id = $1
           AND cp.account_id = $2
           AND cp.left_at IS NULL`,
          [conversationId, accountId]
        );

        if (convCheck.rows.length === 0) {
          return {
            statusCode: 403,
            headers: messageSecurityHeaders,
            body: JSON.stringify({ message: 'Not authorized to view this conversation' }),
          };
        }

        // Mark all messages in this conversation as read for current user
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
            a.name as sender_name,
            a.username as sender_username,
            a.email as sender_email,
            a.avatar_url as sender_avatar,
            a.is_verified as sender_is_verified,
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
          isRead: row.is_read,
          createdAt: row.created_at,
          isMine: row.sender_id === accountId,
          sender: {
            id: row.sender_id,
            name: row.sender_name || row.sender_username || row.sender_email,
            username: row.sender_username,
            email: row.sender_email,
            avatar: row.sender_avatar || '/BestAdsUp.jpg',
            isVerified: row.sender_is_verified || false,
          },
        }));

        return {
          statusCode: 200,
          headers: messageSecurityHeaders,
          body: JSON.stringify(messages),
        };
      } catch (error: any) {
        console.error('Error fetching messages:', {
          message: error.message,
          code: error.code,
        });
        return {
          statusCode: 500,
          headers: messageSecurityHeaders,
          body: JSON.stringify({ message: 'Failed to fetch messages' }),
        };
      }
    })(event);
  }

  // POST /messages - Send a new message
  if (event.httpMethod === 'POST' && segments.length === 0) {
    return withAuth(async (event, { accountId }) => {
      try {
        const body = JSON.parse(event.body || '{}');
        const { recipientId, content, conversationId } = body;

        // Check rate limit
        const rateLimitResult = checkMessageRateLimit(accountId);
        if (!rateLimitResult.allowed) {
          return {
            statusCode: 429,
            headers: messageSecurityHeaders,
            body: JSON.stringify({
              message: 'Too many messages sent. Please try again later.',
              retryAfter: rateLimitResult.retryAfter,
            }),
          };
        }

        // Validate content presence
        if (!content) {
          return {
            statusCode: 400,
            headers: messageSecurityHeaders,
            body: JSON.stringify({ message: 'Message content is required' }),
          };
        }

        // Validate message content
        const contentValidation = validateMessageContent(content);
        if (!contentValidation.valid) {
          return {
            statusCode: 400,
            headers: messageSecurityHeaders,
            body: JSON.stringify({ message: contentValidation.error }),
          };
        }

        // Sanitize content for XSS protection
        const sanitizedContent = sanitizeMessageContent(content);

        let finalConversationId = conversationId;

        // If no conversation ID provided, create or get conversation with recipient
        if (!finalConversationId) {
          if (!recipientId) {
            return {
              statusCode: 400,
              headers: messageSecurityHeaders,
              body: JSON.stringify({ message: 'Either conversationId or recipientId is required' }),
            };
          }

          // Validate UUID format
          if (!isValidUUID(recipientId)) {
            return {
              statusCode: 400,
              headers: messageSecurityHeaders,
              body: JSON.stringify({ message: 'Invalid recipient ID format' }),
            };
          }

          // Validate recipient exists
          const recipientExists = await validateRecipientExists(pool, recipientId);
          if (!recipientExists) {
            return {
              statusCode: 404,
              headers: messageSecurityHeaders,
              body: JSON.stringify({ message: 'Recipient not found' }),
            };
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
            [accountId, recipientId]
          );

          if (existingConv.rows.length > 0) {
            finalConversationId = existingConv.rows[0].id;
          } else {
            // Create new conversation and add participants
            const newConv = await pool.query(
              `INSERT INTO conversations (is_group, created_by)
               VALUES (FALSE, $1)
               RETURNING id`,
              [accountId]
            );
            finalConversationId = newConv.rows[0].id;

            // Add both participants
            await pool.query(
              `INSERT INTO conversation_participants (conversation_id, account_id)
               VALUES ($1, $2), ($1, $3)`,
              [finalConversationId, accountId, recipientId]
            );
          }
        } else {
          // Validate UUID format
          if (!isValidUUID(conversationId)) {
            return {
              statusCode: 400,
              headers: messageSecurityHeaders,
              body: JSON.stringify({ message: 'Invalid conversation ID format' }),
            };
          }

          // Verify user is part of this conversation
          const convCheck = await pool.query(
            `SELECT cp.id
             FROM conversation_participants cp
             WHERE cp.conversation_id = $1
             AND cp.account_id = $2
             AND cp.left_at IS NULL`,
            [conversationId, accountId]
          );

          if (convCheck.rows.length === 0) {
            return {
              statusCode: 403,
              headers: messageSecurityHeaders,
              body: JSON.stringify({ message: 'Not authorized to send messages in this conversation' }),
            };
          }
        }

        // Insert the message with sanitized content
        const result = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, content)
          VALUES ($1, $2, $3)
          RETURNING id, conversation_id, sender_id, content, is_read, created_at`,
          [finalConversationId, accountId, sanitizedContent]
        );

        const message = result.rows[0];

        return {
          statusCode: 201,
          headers: messageSecurityHeaders,
          body: JSON.stringify({
            id: message.id,
            conversationId: message.conversation_id,
            content: message.content,
            isRead: message.is_read,
            createdAt: message.created_at,
            isMine: true,
          }),
        };
      } catch (error: any) {
        console.error('Error sending message:', {
          message: error.message,
          code: error.code,
        });
        return {
          statusCode: 500,
          headers: messageSecurityHeaders,
          body: JSON.stringify({ message: 'Failed to send message' }),
        };
      }
    })(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
