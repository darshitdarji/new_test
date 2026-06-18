// models/order.model.js
// SQL for `orders` and `order_items`. Transaction-heavy operations accept a
// pg client so they can run inside the caller's BEGIN/COMMIT block.
import { query } from '../config/db.js';

/**
 * Lock the current user's cart rows together with their products FOR UPDATE,
 * so stock can be validated without a race against concurrent checkouts.
 * Must be called within a transaction (pass the transaction client).
 */
export async function lockCartWithProducts(client, userId) {
  const { rows } = await client.query(
    `SELECT c.product_id,
            c.quantity,
            p.name,
            p.price,
            p.stock,
            p.is_active
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
      WHERE c.user_id = $1
      ORDER BY c.product_id
      FOR UPDATE OF p`,
    [userId],
  );
  return rows;
}

/** Insert an order header. Returns the new order row. */
export async function insertOrder(client, { userId, status, totalAmount, paymentRef }) {
  const { rows } = await client.query(
    `INSERT INTO orders (user_id, status, total_amount, payment_ref)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, status, total_amount, payment_ref, created_at`,
    [userId, status, totalAmount, paymentRef],
  );
  return rows[0];
}

/** Bulk-insert order line items locking the historical price. */
export async function insertOrderItems(client, orderId, items) {
  const params = [];
  const placeholders = items.map((it, i) => {
    const b = i * 4;
    params.push(orderId, it.product_id, it.quantity, it.price_at_purchase);
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
  });
  await client.query(
    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
     VALUES ${placeholders.join(', ')}`,
    params,
  );
}

/** Fetch an order header for a specific user (ownership check baked in). */
export async function findOrderForUser(orderId, userId, client = null) {
  const exec = client ? client.query.bind(client) : query;
  const { rows } = await exec(
    `SELECT id, user_id, status, total_amount, payment_ref, created_at, updated_at
       FROM orders
      WHERE id = $1 AND user_id = $2
      ${client ? 'FOR UPDATE' : ''}`,
    [orderId, userId],
  );
  return rows[0] || null;
}

/** Line items for an order. */
export async function findOrderItems(orderId, client = null) {
  const exec = client ? client.query.bind(client) : query;
  const { rows } = await exec(
    `SELECT oi.product_id, oi.quantity, oi.price_at_purchase,
            (oi.quantity * oi.price_at_purchase)::numeric(12,2) AS line_total,
            p.name
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id`,
    [orderId],
  );
  return rows;
}

/** List a user's orders (headers only). */
export async function listOrdersForUser(userId, { limit, offset }) {
  const totalResult = await query(
    `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1`,
    [userId],
  );
  const { rows } = await query(
    `SELECT id, status, total_amount, payment_ref, created_at
       FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return { rows, total: totalResult.rows[0].total };
}

/** Update an order's status and payment reference (within a transaction). */
export async function markOrderPaid(client, orderId, paymentRef) {
  await client.query(
    `UPDATE orders
        SET status = 'paid', payment_ref = $2, updated_at = now()
      WHERE id = $1`,
    [orderId, paymentRef],
  );
}

/** Decrement product stock for a paid order, guarding against oversell. */
export async function decrementStock(client, productId, quantity) {
  const { rowCount } = await client.query(
    `UPDATE products
        SET stock = stock - $2, updated_at = now()
      WHERE id = $1 AND stock >= $2`,
    [productId, quantity],
  );
  return rowCount > 0;
}
