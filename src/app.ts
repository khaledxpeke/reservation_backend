import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { getOpenApiSpec } from './docs/openapi';
import { env } from './config';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import packsRoutes from './modules/packs/packs.routes';
import partnersRoutes from './modules/partners/partners.routes';
import resourcesRoutes from './modules/resources/resources.routes';
import availabilitiesRoutes from './modules/availabilities/availabilities.routes';
import offersRoutes from './modules/offers/offers.routes';
import slotsRoutes from './modules/slots/slots.routes';
import reservationsRoutes from './modules/reservations/reservations.routes';
import marketplaceRoutes from './modules/marketplace/marketplace.routes';
import customersRoutes from './modules/customers/customers.routes';
import matchesRoutes from './modules/matches/matches.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import { startScheduler } from './lib/scheduler';

const app = express();

const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman in dev)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger / OpenAPI — development only
if (env.NODE_ENV !== 'production') {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(getOpenApiSpec());
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(getOpenApiSpec(), {
      customSiteTitle: 'Padel Résa API',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }),
  );
}

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/availabilities', availabilitiesRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(errorHandler);

startScheduler();

export default app;

