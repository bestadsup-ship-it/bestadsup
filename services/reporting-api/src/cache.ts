import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function initializeCache(): Promise<void> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    await redisClient.connect();
    console.log('Redis cache initialized');
  }
}

export function getCache(): RedisClientType {
  if (!redisClient) {
    throw new Error('Cache not initialized. Call initializeCache() first.');
  }
  return redisClient;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getCache();
  const cached = await client.get(key);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('Error parsing cached data:', error);
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  const client = getCache();
  await client.setEx(key, ttlSeconds, JSON.stringify(value));
}
