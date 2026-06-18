// routes/wishlist.routes.js
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { productIdParam } from '../validators/common.schema.js';
import { addToWishlistSchema } from '../validators/wishlist.schema.js';
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from '../controllers/wishlist.controller.js';

const router = Router();

// Every wishlist route is protected.
router.use(authenticate);

router.get('/', getWishlist);
router.post('/', validate(addToWishlistSchema), addWishlistItem);
router.delete('/:productId', validate({ params: productIdParam }), removeWishlistItem);

export default router;
