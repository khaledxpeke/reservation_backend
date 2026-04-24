import { Router } from 'express';
import * as notificationsController from './notifications.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notifications.schema';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  notificationsController.listMine,
);

router.get('/unread-count', notificationsController.unreadCount);

router.patch('/read-all', notificationsController.markAllRead);

router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  notificationsController.markRead,
);

export default router;

