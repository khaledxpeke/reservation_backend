import app from './app';
import { env } from './config';
import { logger } from './lib/logger';
import { isRedisConfigured } from './lib/redis';

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  if (!isRedisConfigured()) {
    logger.warn('REDIS_ENABLED=false — running without Redis (no refresh blacklist, no distributed slot locks)');
  }
});
