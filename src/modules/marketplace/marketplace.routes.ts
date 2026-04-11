import { Router } from 'express';
import * as marketplaceController from './marketplace.controller';
import { validate } from '../../middleware/validate';
import { marketplaceSearchSchema, partnerIdParamSchema } from './marketplace.schema';

const router = Router();

router.get('/search', validate({ query: marketplaceSearchSchema }), marketplaceController.searchPartners);
router.get('/partners/:id', validate({ params: partnerIdParamSchema }), marketplaceController.getPublicPartner);

export default router;
