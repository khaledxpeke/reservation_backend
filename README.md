# Multi-Tenant Resource Management & Scheduling - Backend

A scalable backend for managing multi-tenant resource booking (padel courts, coworking spaces, health services, etc.) with role-based access control, a flexible slot engine, and a public marketplace.

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript (strict)
- **Framework:** Express 5
- **ORM:** Prisma (PostgreSQL)
- **Cache (optional):** Redis for refresh-token blacklist and distributed slot locks. Set `REDIS_ENABLED=false` when Redis is not running. Rate limiting uses in-memory storage.
- **Auth:** JWT (access + refresh tokens)
- **Validation:** Zod 4
- **Logging:** Pino
- **Testing:** Vitest

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 6+ (optional; disable with `REDIS_ENABLED=false` in `.env`)

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env with your database and Redis credentials

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database (creates Super Admin + categories + packs)
npm run db:seed

# Start development server
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to DB (no migration file) |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm test` | Run all tests (Vitest: unit + API smoke tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:integration` | Marketplace DB integration test (needs `DATABASE_URL` + migrations) |

### API documentation (Swagger)

With the server running (`npm run dev`):

- **Swagger UI:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs) (port from `PORT`)
- **OpenAPI JSON:** [http://localhost:4000/api/openapi.json](http://localhost:4000/api/openapi.json)

Set `PUBLIC_API_URL` in `.env` so the “Try it out” server URL matches your deployment (e.g. `https://api.example.com`).

The OpenAPI document lives in `src/docs/openapi.ts` — extend `paths` when you add routes.

### Automated tests

- **Default (`npm test`):** runs without requiring a running server; includes slot-engine unit tests, `GET /api/health`, and Swagger/OpenAPI smoke tests.
- **Optional DB integration tests:** run `npm run test:integration` (requires `DATABASE_URL` in `.env` and migrations applied: `npm run db:migrate` or `npx prisma migrate deploy`). This runs `tests/api/marketplace.integration.test.ts` against your database.

### Images (clubs & categories)

Image fields are **HTTPS URLs** (no file upload in this API yet):

| Entity    | Field        | Purpose |
|-----------|--------------|---------|
| Partner   | `logo`       | Square / avatar logo |
| Partner   | `coverImage` | Banner / hero image |
| Category  | `imageUrl`   | Category card / listing image |

Partners can update `logo` and `coverImage` via `PATCH /api/partners/:id`. Super admins set category `imageUrl` via `POST/PATCH /api/categories`. The seed script fills sample Unsplash URLs for local development.

After pulling new migrations, run `npm run db:migrate` then `npm run db:seed` to refresh sample image URLs.

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` - Register a new partner
- `POST /login` - Login
- `POST /refresh` - Rotate refresh token
- `POST /logout` - Blacklist refresh token

### Users (`/api/users`) - Super Admin
- `GET /` - List users (paginated, filterable)
- `PATCH /:id/status` - Block/unblock user
- `DELETE /:id` - Delete user

### Partners (`/api/partners`)
- `GET /` - List all partners (admin)
- `GET /:id` - Get partner details
- `PATCH /:id` - Update partner profile
- `PATCH /:id/verify` - Verify/unverify partner (admin)
- `PATCH /:id/pack` - Assign pack to partner (admin)

### Categories (`/api/categories`)
- `GET /` - List categories + subcategories (public)
- `POST /` - Create category (admin)
- `PATCH /:id` - Update category (admin)
- `DELETE /:id` - Delete category (admin)
- `POST /:id/subcategories` - Add subcategory (admin)
- `PATCH /subcategories/:id` - Update subcategory (admin)
- `DELETE /subcategories/:id` - Delete subcategory (admin)

### Resources (`/api/resources`) - Partner
- `GET /` - List own resources
- `POST /` - Add resource (enforces pack limit)
- `PATCH /:id` - Update resource
- `DELETE /:id` - Deactivate resource

### Availabilities (`/api/availabilities`) - Partner
- `GET /resource/:resourceId` - Get weekly schedule
- `PUT /resource/:resourceId` - Set weekly schedule (bulk upsert)

### Reservations (`/api/reservations`)
- `POST /` - Create booking (public, guest)
- `GET /partner` - List partner's bookings
- `PATCH /:id/status` - Approve/reject booking
- `GET /admin` - Global booking stats (admin)

### Slots (`/api/slots`)
- `GET /available` - Query available slots (public)

### Packs (`/api/packs`)
- `GET /` - List packs (public)
- `POST /` - Create pack (admin)
- `PATCH /:id` - Update pack (admin)
- `DELETE /:id` - Delete pack (admin)

### Offers (`/api/offers`)
- `GET /public` - List approved offers (public)
- `GET /admin` - List all offers (admin)
- `POST /` - Create offer (partner, pending approval)
- `GET /partner` - List own offers (partner)
- `PATCH /:id/approval` - Approve/reject offer (admin)

### Marketplace (`/api/marketplace`)
- `GET /search` - Search partners by category, city, name (public)
- `GET /partners/:id` - Public partner profile with resources

## Project Structure

```
src/
  config/          # Zod-validated env, app config
  docs/            # OpenAPI document (Swagger UI + /api/openapi.json)
  lib/             # Prisma client, Redis client, JWT helpers, slot engine, errors
  middleware/      # Auth, RBAC, validation, error handler, rate limiter, logger
  modules/         # Feature modules (controller -> service -> Prisma)
    auth/
    users/
    partners/
    resources/
    availabilities/
    reservations/
    slots/
    categories/
    packs/
    offers/
    marketplace/
  app.ts           # Express app setup
  server.ts        # Entry point
tests/
  api/             # Vitest + Supertest (health, Swagger, optional DB integration)
vitest.config.ts   # Vitest configuration
```

## Default Credentials

After seeding, you can log in with:
- **Email:** admin@padel.com
- **Password:** Admin123!
