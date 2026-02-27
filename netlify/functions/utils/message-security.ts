import { Pool } from 'pg';
import DOMPurify from 'isomorphic-dompurify';

// Rate limiting configuration for messages
const MESSAGE_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 10;
const MESSAGE_MAX_LENGTH = 10000; // 10,000 characters

// In-memory rate limit store (use Redis in production)
const messageRateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface MessageRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkMessageRateLimit(accountId: string): MessageRateLimitResult {
  const now = Date.now();
  const record = messageRateLimitStore.get(accountId);

  if (!record || now > record.resetTime) {
    messageRateLimitStore.set(accountId, { count: 1, resetTime: now + MESSAGE_RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_MESSAGES_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

export function sanitizeMessageContent(content: string): string {
  let sanitized = content.trim();

  // Remove any HTML/script tags for XSS protection
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return sanitized;
}

export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message content cannot be empty' };
  }

  if (content.length > MESSAGE_MAX_LENGTH) {
    return { valid: false, error: `Message content cannot exceed ${MESSAGE_MAX_LENGTH} characters` };
  }

  return { valid: true };
}

export async function validateRecipientExists(pool: Pool, recipientId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT id FROM accounts WHERE id = $1',
      [recipientId]
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const messageSecurityHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
};
