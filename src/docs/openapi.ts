import { env } from '../config/env';

/**
 * OpenAPI 3 document for Swagger UI. Extend `paths` as you add or change routes.
 */
export function getOpenApiSpec() {
  const base = env.PUBLIC_API_URL.replace(/\/$/, '');

  return {
    openapi: '3.0.3',
    info: {
      title: 'Padel Résa API',
      version: '1.0.0',
      description:
        'Multi-tenant booking backend: auth, partners, resources, slots, reservations, marketplace. ' +
        'Partner club images: `logo`, `coverImage` (URLs). Category listing image: `imageUrl`.',
    },
    servers: [{ url: base, description: 'API base (set PUBLIC_API_URL in .env)' }],
    tags: [
      { name: 'Health', description: 'Liveness' },
      { name: 'Auth', description: 'Register, login, tokens' },
      { name: 'Users', description: 'Super admin — users' },
      { name: 'Partners', description: 'Partner profiles & admin' },
      { name: 'Categories', description: 'Categories & subcategories' },
      { name: 'Packs', description: 'Subscription packs' },
      { name: 'Resources', description: 'Partner resources (courts, rooms)' },
      { name: 'Availabilities', description: 'Weekly schedules' },
      { name: 'Slots', description: 'Public availability query' },
      { name: 'Reservations', description: 'Bookings' },
      { name: 'Offers', description: 'Promotional offers' },
      { name: 'Marketplace', description: 'Public search & partner pages' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {},
          },
        },
        ErrorBody: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri', nullable: true, description: 'Card / hero image URL' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PartnerPublic: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            logo: { type: 'string', format: 'uri', nullable: true },
            coverImage: { type: 'string', format: 'uri', nullable: true, description: 'Banner image URL' },
            city: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string', nullable: true },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register partner account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'city', 'phone', 'categoryId'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                    city: { type: 'string' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                    categoryId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already exists' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Tokens + user' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'New tokens' }, '401': { description: 'Invalid refresh' } },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout (blacklist refresh token)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Logged out' }, '401': { description: 'Unauthorized' } },
        },
      },
      '/api/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List categories (public)',
          responses: {
            '200': {
              description: 'List with subcategories',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          allOf: [
                            { $ref: '#/components/schemas/Category' },
                            {
                              type: 'object',
                              properties: {
                                subCategories: { type: 'array', items: { type: 'object' } },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create category (super admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    imageUrl: { type: 'string', format: 'uri', nullable: true },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Created' }, '401': {}, '403': {} },
        },
      },
      '/api/categories/{id}': {
        patch: {
          tags: ['Categories'],
          summary: 'Update category (super admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    imageUrl: { type: 'string', format: 'uri', nullable: true },
                  },
                },
              },
            },
          },
          responses: { '200': {}, '404': {} },
        },
        delete: {
          tags: ['Categories'],
          summary: 'Delete category (super admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': {}, '404': {} },
        },
      },
      '/api/marketplace/search': {
        get: {
          tags: ['Marketplace'],
          summary: 'Search verified partners',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Paginated partners (includes logo, coverImage, category.imageUrl)',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/marketplace/partners/{id}': {
        get: {
          tags: ['Marketplace'],
          summary: 'Public partner profile (resources, offers, schedule)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': {}, '404': {} },
        },
      },
      '/api/partners': {
        get: {
          tags: ['Partners'],
          summary: 'List partners (super admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'isVerified', in: 'query', schema: { type: 'boolean' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': {}, '401': {}, '403': {} },
        },
        post: {
          tags: ['Partners'],
          summary: 'Create partner (user + club) — super admin',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'city', 'phone', 'categoryId'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string' },
                    city: { type: 'string' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                    categoryId: { type: 'string', format: 'uuid' },
                    logo: { type: 'string', format: 'uri', nullable: true },
                    coverImage: { type: 'string', format: 'uri', nullable: true },
                    packId: { type: 'string', format: 'uuid', nullable: true },
                    isVerified: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { '201': {}, '400': {}, '401': {}, '403': {}, '409': {} },
        },
      },
      '/api/partners/{id}': {
        get: {
          tags: ['Partners'],
          summary: 'Partner detail',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': {}, '404': {} },
        },
        patch: {
          tags: ['Partners'],
          summary: 'Update partner (self or super admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    logo: { type: 'string', format: 'uri', nullable: true },
                    coverImage: { type: 'string', format: 'uri', nullable: true },
                    city: { type: 'string' },
                    phone: { type: 'string' },
                    address: { type: 'string' },
                    categoryId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: { '200': {}, '403': {}, '404': {} },
        },
        delete: {
          tags: ['Partners'],
          summary: 'Delete partner and linked user — super admin',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': {}, '401': {}, '403': {}, '404': {} },
        },
      },
      '/api/slots/available': {
        get: {
          tags: ['Slots'],
          summary: 'Available time slots for a resource on a date',
          parameters: [
            { name: 'resourceId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-04-20' } },
          ],
          responses: { '200': {}, '400': {} },
        },
      },
      '/api/reservations': {
        post: {
          tags: ['Reservations'],
          summary: 'Create reservation (guest)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['resourceId', 'guestName', 'guestPhone', 'date', 'startTime', 'endTime'],
                  properties: {
                    resourceId: { type: 'string', format: 'uuid' },
                    guestName: { type: 'string' },
                    guestPhone: { type: 'string' },
                    guestEmail: { type: 'string', format: 'email' },
                    date: { type: 'string' },
                    startTime: { type: 'string', example: '10:00' },
                    endTime: { type: 'string', example: '11:30' },
                  },
                },
              },
            },
          },
          responses: { '201': {}, '400': {}, '409': {} },
        },
      },
    },
  };
}

