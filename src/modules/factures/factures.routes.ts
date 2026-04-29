import { Router } from 'express';
import * as facturesController from './factures.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  factureIdParamSchema,
  listFacturesQuerySchema,
  updateFacturePaymentSchema,
} from './factures.schema';

const router = Router();

router.get(
  '/etat-reglement',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ query: listFacturesQuerySchema }),
  facturesController.listEtatReglement,
);

router.get(
  '/partner',
  authenticate,
  authorize('PARTNER'),
  validate({ query: listFacturesQuerySchema.omit({ partnerId: true }) }),
  facturesController.listPartnerFactures,
);

router.get(
  '/:id/pdf',
  authenticate,
  authorize('SUPER_ADMIN', 'PARTNER'),
  validate({ params: factureIdParamSchema }),
  facturesController.downloadFacturePdf,
);

router.patch(
  '/:id/payment',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: factureIdParamSchema, body: updateFacturePaymentSchema }),
  facturesController.updateFacturePayment,
);

export default router;
