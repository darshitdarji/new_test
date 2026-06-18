// routes/cart.routes.js
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { productIdParam } from '../validators/common.schema.js';
import { addToCartSchema, updateCartSchema } from '../validators/cart.schema.js';
import {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
} from '../controllers/cart.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.post('/', validate(addToCartSchema), addCartItem);
router.patch(
  '/:productId',
  validate({ params: productIdParam, ...updateCartSchema }),
  updateCartItem,
);
router.delete('/:productId', validate({ params: productIdParam }), deleteCartItem);

export default router;
