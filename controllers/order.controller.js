// controllers/order.controller.js
import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { withTransaction } from '../config/db.js';
import { clearCart } from '../models/cart.model.js';
import {
  lockCartWithProducts,
  insertOrder,
  insertOrderItems,
  findOrderForUser,
  findOrderItems,
  listOrdersForUser,
  markOrderPaid,
  decrementStock,
} from '../models/order.model.js';

/**
 * POST /orders/checkout
 * Validates the cart against live inventory inside a transaction, locks the
 * product rows, and creates a PENDING order. Stock is NOT decremented yet —
 * that happens on payment confirmation.
 */
export const checkout = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const order = await withTransaction(async (client) => {
    const cart = await lockCartWithProducts(client, userId);

    if (cart.length === 0) throw ApiError.badRequest('Cart is empty');

    // Validate availability for every line.
    const issues = [];
    for (const line of cart) {
      if (!line.is_active) {
        issues.push({ productId: line.product_id, reason: 'no longer available' });
      } else if (line.stock < line.quantity) {
        issues.push({
          productId: line.product_id,
          reason: `insufficient stock (requested ${line.quantity}, available ${line.stock})`,
        });
      }
    }
    if (issues.length > 0) {
      throw new ApiError(409, 'Some items are unavailable', { details: issues });
    }

    const totalAmount = cart
      .reduce((sum, l) => sum + Number(l.price) * l.quantity, 0)
      .toFixed(2);

    // A mock payment reference the client would hand to a real gateway.
    const paymentRef = `MOCK-${crypto.randomBytes(8).toString('hex')}`;

    const header = await insertOrder(client, {
      userId,
      status: 'pending',
      totalAmount,
      paymentRef,
    });

    await insertOrderItems(
      client,
      header.id,
      cart.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        price_at_purchase: l.price,
      })),
    );

    return {
      ...header,
      items: cart.map((l) => ({
        product_id: l.product_id,
        name: l.name,
        quantity: l.quantity,
        price_at_purchase: l.price,
      })),
    };
  });

  return created(res, {
    order,
    payment: {
      paymentRef: order.payment_ref,
      message: 'Order created. Confirm payment to finalize.',
    },
  });
});

/**
 * POST /orders/:id/confirm-payment
 * Mock gateway callback. On success: re-validate stock, mark PAID, decrement
 * inventory, and clear the cart — all atomically. Idempotent if already paid.
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;
  // A real gateway would send a verifiable signature/status; we mock success.
  const success = req.body?.success !== false;

  const result = await withTransaction(async (client) => {
    const order = await findOrderForUser(orderId, userId, client); // FOR UPDATE
    if (!order) throw ApiError.notFound('Order not found');

    if (order.status === 'paid') {
      return { order, alreadyPaid: true };
    }
    if (order.status === 'cancelled') {
      throw ApiError.conflict('Order has been cancelled');
    }

    if (!success) {
      throw ApiError.badRequest('Payment failed');
    }

    const items = await findOrderItems(orderId, client);

    // Re-check & decrement stock atomically; the conditional UPDATE prevents oversell.
    for (const item of items) {
      const okStock = await decrementStock(client, item.product_id, item.quantity);
      if (!okStock) {
        throw ApiError.conflict(
          `Insufficient stock for "${item.name}" — payment reversed`,
        );
      }
    }

    await markOrderPaid(client, orderId, order.payment_ref);
    await clearCart(userId, client);

    return { order: { ...order, status: 'paid' }, alreadyPaid: false, items };
  });

  return ok(res, {
    orderId: Number(orderId),
    status: 'paid',
    alreadyPaid: result.alreadyPaid,
    message: result.alreadyPaid
      ? 'Order was already paid'
      : 'Payment confirmed; inventory updated and cart cleared.',
  });
});

/** GET /orders — list the authenticated user's orders. */
export const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { rows, total } = await listOrdersForUser(req.user.id, { limit, offset });
  return ok(res, rows, buildMeta({ page, limit, total }));
});

/** GET /orders/:id — order detail with line items (ownership enforced). */
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOrderForUser(req.params.id, req.user.id);
  if (!order) throw ApiError.notFound('Order not found');

  const items = await findOrderItems(order.id);
  return ok(res, { ...order, items });
});
