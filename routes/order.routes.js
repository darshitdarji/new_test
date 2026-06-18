// routes/order.routes.js
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { idParam } from '../validators/common.schema.js';
import {
  checkout,
  confirmPayment,
  getOrders,
  getOrderById,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

router.post('/checkout', checkout);
router.post('/:id/confirm-payment', validate({ params: idParam }), confirmPayment);
router.get('/', getOrders);
router.get('/:id', validate({ params: idParam }), getOrderById);

export default router;
