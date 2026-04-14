import { Router } from 'express';
import * as reservationsController from './reservations.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createReservationSchema,
  updateReservationStatusSchema,
  reservationIdParamSchema,
  listReservationsQuerySchema,
} from './reservations.schema';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ query: listReservationsQuerySchema }),
  reservationsController.listAdminReservations,
);

router.post('/', validate({ body: createReservationSchema }), reservationsController.createReservation);

router.get(
  '/partner',
  authenticate,
  authorize('PARTNER'),
  validate({ query: listReservationsQuerySchema }),
  reservationsController.listPartnerReservations,
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('PARTNER', 'SUPER_ADMIN'),
  validate({ params: reservationIdParamSchema, body: updateReservationStatusSchema }),
  reservationsController.updateReservationStatus,
);

router.get(
  '/admin',
  authenticate,
  authorize('SUPER_ADMIN'),
  reservationsController.getAdminStats,
);

router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: reservationIdParamSchema }),
  reservationsController.deleteReservation,
);

export default router;
