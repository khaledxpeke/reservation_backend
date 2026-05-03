import { Router } from 'express';
import * as matchesController from './matches.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { validate } from '../../middleware/validate';
import {
  createMatchPostSchema,
  updateMatchPostSchema,
  listMatchPostsQuerySchema,
  createJoinRequestSchema,
  updateJoinRequestSchema,
  matchIdParamSchema,
  matchAndRequestIdParamSchema,
} from './matches.schema';

const router = Router();
const customerOnly = [authenticate, authorize('CUSTOMER')];

// Public browsing — anyone can read. Optional auth lets signed-in users
// unlock contact info for their own posts / accepted matches.
router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listMatchPostsQuerySchema }),
  matchesController.listPosts,
);

// "Mine" endpoints must be declared before the dynamic /:id route.
router.get(
  '/me/created',
  ...customerOnly,
  validate({ query: listMatchPostsQuerySchema }),
  matchesController.listMyCreated,
);
router.get(
  '/me/requests',
  ...customerOnly,
  validate({ query: listMatchPostsQuerySchema }),
  matchesController.listMyRequests,
);

router.post(
  '/',
  ...customerOnly,
  validate({ body: createMatchPostSchema }),
  matchesController.createPost,
);

router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: matchIdParamSchema }),
  matchesController.getPost,
);

router.patch(
  '/:id',
  ...customerOnly,
  validate({ params: matchIdParamSchema, body: updateMatchPostSchema }),
  matchesController.updatePost,
);

router.delete(
  '/:id',
  ...customerOnly,
  validate({ params: matchIdParamSchema }),
  matchesController.cancelPost,
);

router.post(
  '/:id/requests',
  ...customerOnly,
  validate({ params: matchIdParamSchema, body: createJoinRequestSchema }),
  matchesController.joinPost,
);

router.delete(
  '/:id/requests/me',
  ...customerOnly,
  validate({ params: matchIdParamSchema }),
  matchesController.withdrawRequest,
);

router.patch(
  '/:id/requests/:requestId',
  ...customerOnly,
  validate({ params: matchAndRequestIdParamSchema, body: updateJoinRequestSchema }),
  matchesController.respondRequest,
);

// Chat history (authenticated members only)
router.get(
  '/:id/messages',
  ...customerOnly,
  validate({ params: matchIdParamSchema }),
  matchesController.getChatMessages,
);

export default router;

