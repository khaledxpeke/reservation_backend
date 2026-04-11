import rateLimit from 'express-rate-limit';
import { env } from '../config';

/**
 * In-memory stores only. Using Redis for rate limits required a live Redis before any request;
 * that caused connection storms and MaxRetriesPerRequestError when Redis was down.
 * For multi-instance deployments, add Redis-backed stores once Redis is guaranteed available.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 200 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many authentication attempts' },
  },
});
