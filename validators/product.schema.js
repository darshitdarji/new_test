// validators/product.schema.js
import { z } from 'zod';
import { paginationQuery } from './common.schema.js';

export const listProductsSchema = {
  query: z
    .object({
      ...paginationQuery,
      category: z.string().trim().min(1).optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      q: z.string().trim().min(1).optional(),
      sort: z.enum(['created_at', 'price', 'name']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    })
    .refine(
      (v) => v.minPrice == null || v.maxPrice == null || v.minPrice <= v.maxPrice,
      { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
    ),
};

export const createProductSchema = {
  body: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    price: z.number().min(0),
    category: z.string().trim().min(1).max(80),
    stock: z.number().int().min(0).optional(),
    image_url: z.string().url().optional(),
    is_active: z.boolean().optional(),
  }),
};

export const updateProductSchema = {
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional(),
      price: z.number().min(0).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      stock: z.number().int().min(0).optional(),
      image_url: z.string().url().optional(),
      is_active: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: 'At least one field must be provided',
    }),
};
