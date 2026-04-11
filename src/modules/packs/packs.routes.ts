import { Router } from 'express';
import * as packsController from './packs.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createPackSchema, updatePackSchema, packIdParamSchema } from './packs.schema';

const router = Router();

router.get('/', packsController.listPacks);

router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ body: createPackSchema }),
  packsController.createPack,
);

router.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: packIdParamSchema, body: updatePackSchema }),
  packsController.updatePack,
);

router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: packIdParamSchema }),
  packsController.deletePack,
);

export default router;
