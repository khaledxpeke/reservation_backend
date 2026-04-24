import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { listUsersQuerySchema, updateUserStatusSchema, userIdParamSchema } from './users.schema';

const router = Router();

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', validate({ query: listUsersQuerySchema }), usersController.listUsers);
router.patch('/:id/status', validate({ params: userIdParamSchema, body: updateUserStatusSchema }), usersController.updateUserStatus);
router.delete('/:id', validate({ params: userIdParamSchema }), usersController.deleteUser);

export default router;

