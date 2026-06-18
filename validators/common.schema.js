// validators/common.schema.js
// Reusable zod fragments shared across modules.
import { z } from 'zod';

// Positive integer id coming from a route param (string → number).
export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const productIdParam = z.object({
  productId: z.coerce.number().int().positive(),
});

// Pagination query fragment (page/limit) — coerced from strings.
export const paginationQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
};
