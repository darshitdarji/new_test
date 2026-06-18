// validators/cart.schema.js
import { z } from 'zod';

export const addToCartSchema = {
  body: z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive().max(1000).default(1),
  }),
};

export const updateCartSchema = {
  body: z.object({
    // 0 is allowed and means "remove this line".
    quantity: z.coerce.number().int().min(0).max(1000),
  }),
};
