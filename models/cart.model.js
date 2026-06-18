// models/cart.model.js
// SQL for the `cart_items` table. The cart total is computed in SQL.
import { query } from '../config/db.js';

/** Return a user's cart line items joined with current product info. */
export async function listCartItems(userId) {
  const { rows } = await query(
    `SELECT c.product_id,
            c.quantity,
            p.name,
            p.price,
            p.stock,
            p.image_url,
            p.is_active,
            (c.quantity * p.price)::numeric(12,2) AS line_total
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
      WHERE c.user_id = $1
      ORDER BY c.created_at ASC`,
    [userId],
  );
  return rows;
}

/**
 * Add a product to the cart, incrementing quantity if it already exists.
 * Uses ON CONFLICT to keep this atomic.
 */
export async function addToCart(userId, productId, quantity) {
  const { rows } = await query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                     updated_at = now()
     RETURNING product_id, quantity`,
    [userId, productId, quantity],
  );
  return rows[0];
}

/** Set the absolute quantity for a cart line. Returns the row or null. */
export async function setCartQuantity(userId, productId, quantity) {
  const { rows } = await query(
    `UPDATE cart_items
        SET quantity = $3, updated_at = now()
      WHERE user_id = $1 AND product_id = $2
      RETURNING product_id, quantity`,
    [userId, productId, quantity],
  );
  return rows[0] || null;
}

/** Remove a single line. Returns true if a row was deleted. */
export async function removeCartItem(userId, productId) {
  const { rowCount } = await query(
    `DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );
  return rowCount > 0;
}

/** Empty the whole cart for a user. */
export async function clearCart(userId, client = null) {
  const exec = client ? client.query.bind(client) : query;
  await exec(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
}
