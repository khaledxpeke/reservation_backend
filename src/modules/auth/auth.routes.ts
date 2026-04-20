import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  registerCustomerSchema,
  loginSchema,
  refreshSchema,
} from './auth.schema';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post(
  '/register-customer',
  authLimiter,
  validate({ body: registerCustomerSchema }),
  authController.registerCustomer,
);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authenticate, validate({ body: refreshSchema }), authController.logout);

export default router;
