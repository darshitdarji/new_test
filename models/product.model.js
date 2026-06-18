// models/product.model.js
// SQL for the `products` table: public listing/search + admin CRUD.
import { query } from '../config/db.js';

/**
 * List active products with filtering, search, sorting and pagination.
 * Builds a parameterized WHERE clause dynamically (injection-safe).
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function listProducts({
  category,
  minPrice,
  maxPrice,
  q,
  sort = 'created_at',
  order = 'desc',
  limit,
  offset,
}) {
  const where = ['is_active = TRUE'];
  const params = [];

  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (minPrice != null) {
    params.push(minPrice);
    where.push(`price >= $${params.length}`);
  }
  if (maxPrice != null) {
    params.push(maxPrice);
    where.push(`price <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`name ILIKE $${params.length}`);
  }

  // Whitelist sort columns/directions — never interpolate raw user input.
  const SORT_COLS = { created_at: 'created_at', price: 'price', name: 'name' };
  const sortCol = SORT_COLS[sort] || 'created_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const whereClause = where.join(' AND ');

  // total (for pagination meta) — reuses the same filter params.
  const totalResult = await query(
    `SELECT COUNT(*)::int AS total FROM products WHERE ${whereClause}`,
    params,
  );
  const total = totalResult.rows[0].total;

  // page of rows
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT id, name, description, price, category, stock, image_url, is_active, created_at
       FROM products
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total };
}

/** Fetch a single active product by id. */
export async function findActiveProductById(id) {
  const { rows } = await query(
    `SELECT id, name, description, price, category, stock, image_url, is_active, created_at
       FROM products
      WHERE id = $1 AND is_active = TRUE`,
    [id],
  );
  return rows[0] || null;
}

/** Fetch any product (active or not) — admin use. */
export async function findProductById(id) {
  const { rows } = await query(`SELECT * FROM products WHERE id = $1`, [id]);
  return rows[0] || null;
}

/** Create a product (admin). */
export async function createProduct(p) {
  const { rows } = await query(
    `INSERT INTO products (name, description, price, category, stock, image_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
     RETURNING *`,
    [p.name, p.description ?? '', p.price, p.category, p.stock ?? 0, p.image_url ?? null, p.is_active],
  );
  return rows[0];
}

/**
 * Update a product (admin). Only provided fields are changed.
 * @returns the updated row, or null if the product doesn't exist.
 */
export async function updateProduct(id, fields) {
  const allowed = ['name', 'description', 'price', 'category', 'stock', 'image_url', 'is_active'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }

  if (sets.length === 0) {
    // Nothing to update — return current row.
    return findProductById(id);
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE products
        SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${params.length}
      RETURNING *`,
    params,
  );
  return rows[0] || null;
}

/** Hard-delete a product (admin). Returns the deleted id or null. */
export async function deleteProduct(id) {
  const { rows } = await query(
    `DELETE FROM products WHERE id = $1 RETURNING id`,
    [id],
  );
  return rows[0]?.id ?? null;
}

/** Soft-delete (deactivate) — keeps history & order_items intact. */
export async function deactivateProduct(id) {
  const { rows } = await query(
    `UPDATE products SET is_active = FALSE, updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id],
  );
  return rows[0]?.id ?? null;
}
