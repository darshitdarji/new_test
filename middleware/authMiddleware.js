// middleware/authMiddleware.js
// Verifies the Bearer JWT, loads the user, and attaches it to req.user.
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { findUserById } from '../models/user.model.js';

/** Require a valid JWT. Populates req.user = { id, name, email, role }. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Confirm the user still exists (token could outlive a deleted account).
  const user = await findUserById(payload.id);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
});

/**
 * Restrict a route to specific roles. Use after `authenticate`.
 * @param {...string} roles
 */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
