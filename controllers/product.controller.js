// controllers/product.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, noContent } from '../utils/response.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import {
  listProducts,
  findActiveProductById,
  findProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../models/product.model.js';

/** GET /products — public, paginated, filterable, searchable. */
export const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { category, minPrice, maxPrice, q, sort, order } = req.query;

  const { rows, total } = await listProducts({
    category,
    minPrice,
    maxPrice,
    q,
    sort,
    order,
    limit,
    offset,
  });

  return ok(res, rows, buildMeta({ page, limit, total }));
});

/** GET /products/:id — public. */
export const getProductById = asyncHandler(async (req, res) => {
  const product = await findActiveProductById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, product);
});

/** POST /products — admin only. */
export const postProduct = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);
  return created(res, product);
});

/** PUT /products/:id — admin only. */
export const putProduct = asyncHandler(async (req, res) => {
  const existing = await findProductById(req.params.id);
  if (!existing) throw ApiError.notFound('Product not found');

  const product = await updateProduct(req.params.id, req.body);
  return ok(res, product);
});

/** DELETE /products/:id — admin only (hard delete). */
export const removeProduct = asyncHandler(async (req, res) => {
  const deletedId = await deleteProduct(req.params.id);
  if (!deletedId) throw ApiError.notFound('Product not found');
  return noContent(res);
});
