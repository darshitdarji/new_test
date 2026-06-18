// routes/product.routes.js
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import { idParam } from '../validators/common.schema.js';
import {
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
} from '../validators/product.schema.js';
import {
  getProducts,
  getProductById,
  postProduct,
  putProduct,
  removeProduct,
} from '../controllers/product.controller.js';

const router = Router();

// Public
router.get('/', validate(listProductsSchema), getProducts);
router.get('/:id', validate({ params: idParam }), getProductById);

// Admin-only
router.post('/', authenticate, requireRole('admin'), validate(createProductSchema), postProduct);
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate({ params: idParam, ...updateProductSchema }),
  putProduct,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate({ params: idParam }),
  removeProduct,
);

export default router;
