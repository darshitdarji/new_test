// utils/pagination.js
// Normalize page/limit query params and build a pagination meta object.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * @param {{ page?: number, limit?: number }} query - already coerced by zod.
 * @returns {{ page: number, limit: number, offset: number }}
 */
export const getPagination = ({ page = 1, limit = DEFAULT_LIMIT } = {}) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};

/** Build the `pagination` block returned to clients. */
export const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});
