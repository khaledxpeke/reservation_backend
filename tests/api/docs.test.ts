import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('API documentation', () => {
  it('serves OpenAPI JSON', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info?.title).toBe('Padel Résa API');
    expect(res.body.paths).toBeDefined();
  });

  it('serves Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    expect(res.text).toContain('swagger');
  });
});
