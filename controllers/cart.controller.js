// controllers/cart.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, noContent } from '../utils/response.js';
import {
  listCartItems,
  addToCart,
  setCartQuantity,
  removeCartItem,
} from '../models/cart.model.js';
import { findActiveProductById } from '../models/product.model.js';

/** Compute the cart total from line items (numbers come back as strings from pg). */
const cartTotal = (items) =>
  items
    .reduce((sum, it) => sum + Number(it.line_total), 0)
    .toFixed(2);

/** GET /cart — items + dynamically calculated total. */
export const getCart = asyncHandler(async (req, res) => {
  const items = await listCartItems(req.user.id);
  return ok(res, {
    items,
    itemCount: items.reduce((n, it) => n + it.quantity, 0),
    total: cartTotal(items),
  });
});

/** POST /cart — add a product, incrementing quantity if already present. */
export const addCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await findActiveProductById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const line = await addToCart(req.user.id, productId, quantity);
  return created(res, line);
});

/** PATCH /cart/:productId — set absolute quantity (0 removes the line). */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === 0) {
    const removed = await removeCartItem(req.user.id, productId);
    if (!removed) throw ApiError.notFound('Item not in cart');
    return noContent(res);
  }

  const line = await setCartQuantity(req.user.id, productId, quantity);
  if (!line) throw ApiError.notFound('Item not in cart');
  return ok(res, line);
});

/** DELETE /cart/:productId */
export const deleteCartItem = asyncHandler(async (req, res) => {
  const removed = await removeCartItem(req.user.id, req.params.productId);
  if (!removed) throw ApiError.notFound('Item not in cart');
  return noContent(res);
});
