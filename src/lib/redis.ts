import Redis from 'ioredis';
import { env } from '../config';
import { logger } from './logger';

function createClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    // Avoid MaxRetriesPerRequestError when Redis is down; commands fail fast instead of killing the process.
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 20) {
        return null;
      }
      return Math.min(times * 200, 3000);
    },
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('ready', () => logger.info('Redis ready'));
  client.on('error', (err) => {
    logger.warn({ err }, 'Redis error');
  });
  client.on('end', () => logger.warn('Redis connection closed'));

  return client;
}

/** Null when REDIS_ENABLED=false. Otherwise a lazily-connecting client (no explicit connect() in server). */
export const redis: Redis | null = env.REDIS_ENABLED ? createClient() : null;

export function isRedisConfigured(): boolean {
  return redis !== null;
}

