import { Router } from 'express';
import * as availabilitiesController from './availabilities.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { setAvailabilitiesSchema, resourceIdParamSchema } from './availabilities.schema';

const router = Router();

router.use(authenticate, authorize('PARTNER'));

router.get(
  '/resource/:resourceId',
  validate({ params: resourceIdParamSchema }),
  availabilitiesController.getAvailabilities,
);

router.put(
  '/resource/:resourceId',
  validate({ params: resourceIdParamSchema, body: setAvailabilitiesSchema }),
  availabilitiesController.setAvailabilities,
);

export default router;
