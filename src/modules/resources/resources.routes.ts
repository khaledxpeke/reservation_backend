import { Router } from 'express';
import * as resourcesController from './resources.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createResourceSchema, updateResourceSchema, resourceIdParamSchema } from './resources.schema';

const router = Router();

router.use(authenticate, authorize('PARTNER'));

router.get('/', resourcesController.listResources);
router.post('/', validate({ body: createResourceSchema }), resourcesController.createResource);
router.patch('/:id', validate({ params: resourceIdParamSchema, body: updateResourceSchema }), resourcesController.updateResource);
router.delete('/:id', validate({ params: resourceIdParamSchema }), resourcesController.deleteResource);

export default router;
