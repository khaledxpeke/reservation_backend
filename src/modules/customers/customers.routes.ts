import { Router } from 'express';
import { z } from 'zod';
import * as customersController from './customers.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  updateCustomerProfileSchema,
  listMyReservationsQuerySchema,
} from './customers.schema';

const router = Router();

const customerOnly = [authenticate, authorize('CUSTOMER')];

router.get('/me', ...customerOnly, customersController.getMe);

router.patch(
  '/me',
  ...customerOnly,
  validate({ body: updateCustomerProfileSchema }),
  customersController.updateMe,
);

router.get(
  '/me/reservations',
  ...customerOnly,
  validate({ query: listMyReservationsQuerySchema }),
  customersController.listMyReservations,
);

router.patch(
  '/me/reservations/:id/cancel',
  ...customerOnly,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  customersController.cancelMyReservation,
);

export default router;
