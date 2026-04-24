import { Router } from 'express';
import * as slotsController from './slots.controller';
import { validate } from '../../middleware/validate';
import { availableSlotsQuerySchema } from './slots.schema';

const router = Router();

router.get('/available', validate({ query: availableSlotsQuerySchema }), slotsController.getAvailableSlots);

export default router;

