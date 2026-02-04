import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

export async function initializeCache(): Promise<void> {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  await redisClient.connect();
  console.log('Redis connected successfully');
}

export function getCache(): RedisClientType {
  if (!redisClient) {
    throw new Error('Cache not initialized');
  }
  return redisClient;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}
