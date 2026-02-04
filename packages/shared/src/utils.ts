import crypto from 'crypto';

/**
 * Generate a signed or opaque ad unit identifier
 */
export function generateAdUnitToken(adUnitId: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(adUnitId);
  return hmac.digest('hex').substring(0, 16);
}

/**
 * Verify ad unit token
 */
export function verifyAdUnitToken(adUnitId: string, token: string, secret: string): boolean {
  const expectedToken = generateAdUnitToken(adUnitId, secret);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}

/**
 * Calculate revenue from impressions and CPM
 */
export function calculateRevenue(impressions: number, cpmCents: number): number {
  return Math.round((impressions / 1000) * cpmCents);
}

/**
 * Calculate fill rate
 */
export function calculateFillRate(impressions: number, requests: number): number {
  if (requests === 0) return 0;
  return Number(((impressions / requests) * 100).toFixed(2));
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash password using bcrypt-compatible approach
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

/**
 * Sleep utility for testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry logic with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}
