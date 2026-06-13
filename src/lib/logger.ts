import pino from 'pino';
import { env } from '../config';

const isProd = env.NODE_ENV === 'production';

export const logger = isProd
  ? pino({
      level: 'info',
    })
  : pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    });