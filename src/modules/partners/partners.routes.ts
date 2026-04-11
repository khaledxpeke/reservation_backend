import { Router } from 'express';
import * as partnersController from './partners.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  listPartnersQuerySchema,
  updatePartnerSchema,
  verifyPartnerSchema,
  assignPackSchema,
  partnerIdParamSchema,
} from './partners.schema';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ query: listPartnersQuerySchema }),
  partnersController.listPartners,
);

router.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'PARTNER'),
  validate({ params: partnerIdParamSchema }),
  partnersController.getPartner,
);

router.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'PARTNER'),
  validate({ params: partnerIdParamSchema, body: updatePartnerSchema }),
  partnersController.updatePartner,
);

router.patch(
  '/:id/verify',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: partnerIdParamSchema, body: verifyPartnerSchema }),
  partnersController.verifyPartner,
);

router.patch(
  '/:id/pack',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: partnerIdParamSchema, body: assignPackSchema }),
  partnersController.assignPack,
);

export default router;
