// controllers/wishlist.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, noContent } from '../utils/response.js';
import {
  listWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../models/wishlist.model.js';
import { findActiveProductById } from '../models/product.model.js';

/** GET /wishlist */
export const getWishlist = asyncHandler(async (req, res) => {
  const items = await listWishlist(req.user.id);
  return ok(res, items);
});

/** POST /wishlist */
export const addWishlistItem = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await findActiveProductById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const inserted = await addToWishlist(req.user.id, productId);
  return created(res, {
    productId,
    added: inserted,
    message: inserted ? 'Added to wishlist' : 'Already in wishlist',
  });
});

/** DELETE /wishlist/:productId */
export const removeWishlistItem = asyncHandler(async (req, res) => {
  const removed = await removeFromWishlist(req.user.id, req.params.productId);
  if (!removed) throw ApiError.notFound('Item not in wishlist');
  return noContent(res);
});
