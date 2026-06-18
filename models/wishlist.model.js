// models/wishlist.model.js
// SQL for the `wishlists` table.
import { query } from '../config/db.js';

/** List a user's wishlist joined with product details. */
export async function listWishlist(userId) {
  const { rows } = await query(
    `SELECT w.id            AS wishlist_id,
            w.created_at    AS added_at,
            p.id            AS product_id,
            p.name,
            p.description,
            p.price,
            p.category,
            p.stock,
            p.image_url,
            p.is_active
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
    [userId],
  );
  return rows;
}

/**
 * Add a product to the wishlist. Idempotent via the (user_id, product_id) unique
 * constraint: a duplicate is a no-op.
 * @returns {Promise<boolean>} true if a new row was inserted.
 */
export async function addToWishlist(userId, productId) {
  const { rowCount } = await query(
    `INSERT INTO wishlists (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [userId, productId],
  );
  return rowCount > 0;
}

/** Remove a product from the wishlist. Returns true if a row was deleted. */
export async function removeFromWishlist(userId, productId) {
  const { rowCount } = await query(
    `DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2`,
    [userId, productId],
  );
  return rowCount > 0;
}
