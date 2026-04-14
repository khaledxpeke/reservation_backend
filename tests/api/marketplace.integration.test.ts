import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

/**
 * Hits the real DB via Prisma. Skipped when DATABASE_URL is missing or INTEGRATION_TESTS is not "true".
 */
const run = process.env.INTEGRATION_TESTS === 'true' && !!process.env.DATABASE_URL;

describe.skipIf(!run)('GET /api/marketplace/search (integration)', () => {
  beforeAll(() => {
    // Ensure env loaded (tests/setup.ts)
    if (!process.env.DATABASE_URL) {
      throw new Error('INTEGRATION_TESTS requires DATABASE_URL');
    }
  });

  it('returns paginated JSON', async () => {
    const res = await request(app).get('/api/marketplace/search').query({ page: 1, limit: 5 }).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    if (res.body.data.items.length > 0) {
      const first = res.body.data.items[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first.category).toBeDefined();
    }
  });
});
