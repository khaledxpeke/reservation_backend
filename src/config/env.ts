import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),
  /** When false, the app runs without Redis (in-memory rate limits; no refresh blacklist / slot locks). */
  REDIS_ENABLED: z.coerce.boolean().default(true),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  SUPER_ADMIN_EMAIL: z.string().email().default('admin@padel.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(6).default('Admin123!'),

  /** Base URL for OpenAPI "Try it out" (include /api if you use a reverse proxy path). */
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
