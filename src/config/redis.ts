import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn('Redis max retries reached, giving up');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error: Error) => {
      logger.warn({ error: error.message }, 'Redis connection error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize Redis client');
    redisClient = null;
  }
} else {
  logger.warn('REDIS_URL not configured, caching disabled');
}

export const redis = redisClient;

export const cacheService = {
  async get(key: string): Promise<string | null> {
    if (!redis) {
      return null;
    }
    try {
      return await redis.get(key);
    } catch (error) {
      logger.warn(`[Redis] Error getting key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!redis) {
      return;
    }
    try {
      await redis.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      logger.warn(`[Redis] Error setting key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    if (!redis) {
      return;
    }
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn(`[Redis] Error deleting key ${key}:`, error);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    if (!redis) {
      return;
    }
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`[Redis] Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.warn(`[Redis] Error deleting keys with pattern ${pattern}:`, error);
    }
  },

  isConnected(): boolean {
    return redis !== null && redis.status === 'ready';
  },
};
