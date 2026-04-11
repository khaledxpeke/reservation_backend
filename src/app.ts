import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

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

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

app.use(errorHandler);

export default app;
