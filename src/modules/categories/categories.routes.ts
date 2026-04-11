import { Router } from 'express';
import * as categoriesController from './categories.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  createSubCategorySchema,
  updateSubCategorySchema,
  categoryIdParamSchema,
} from './categories.schema';

const router = Router();

router.get('/', categoriesController.listCategories);

router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ body: createCategorySchema }),
  categoriesController.createCategory,
);

router.patch(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoriesController.updateCategory,
);

router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: categoryIdParamSchema }),
  categoriesController.deleteCategory,
);

router.post(
  '/:id/subcategories',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: categoryIdParamSchema, body: createSubCategorySchema }),
  categoriesController.addSubCategory,
);

router.patch(
  '/subcategories/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: categoryIdParamSchema, body: updateSubCategorySchema }),
  categoriesController.updateSubCategory,
);

router.delete(
  '/subcategories/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate({ params: categoryIdParamSchema }),
  categoriesController.deleteSubCategory,
);

export default router;
