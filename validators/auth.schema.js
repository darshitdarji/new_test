// validators/auth.schema.js
import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters'); // bcrypt's byte limit

export const signupSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password,
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password,
  }),
};
