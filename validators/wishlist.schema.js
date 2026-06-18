// validators/wishlist.schema.js
import { z } from 'zod';

export const addToWishlistSchema = {
  body: z.object({
    productId: z.coerce.number().int().positive(),
  }),
};
