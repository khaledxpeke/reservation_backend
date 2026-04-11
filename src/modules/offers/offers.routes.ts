import { Router } from 'express';
import * as offersController from './offers.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createOfferSchema,
  updateOfferApprovalSchema,
  offerIdParamSchema,
  listOffersQuerySchema,
} from './offers.schema';

const router = Router();

router.get('/public', validate({ query: listOffersQuerySchema }), offersController.listPublicOffers);

router.get(
  '/admin',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ query: listOffersQuerySchema }),
  offersController.listAllOffers,
);

router.post(
  '/',
  authenticate,
  authorize('PARTNER'),
  validate({ body: createOfferSchema }),
  offersController.createOffer,
);

router.get(
  '/partner',
  authenticate,
  authorize('PARTNER'),
  validate({ query: listOffersQuerySchema }),
  offersController.listPartnerOffers,
);

router.patch(
  '/:id/approval',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: offerIdParamSchema, body: updateOfferApprovalSchema }),
  offersController.updateApproval,
);

export default router;
