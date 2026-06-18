// config/env.js
// Loads environment variables from .env and validates them with zod.
// Exposes a single frozen `env` object used across the app.
import 'dotenv/config';
import { z } from 'zod';

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    // Database — either a full URL or discrete parts.
    DATABASE_URL: z.string().optional(),
    PGHOST: z.string().default('localhost'),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGUSER: z.string().default('postgres'),
    PGPASSWORD: z.string().default('postgres'),
    PGDATABASE: z.string().default('ecommerce'),
    PGSSL: booleanish.default('false'),

    // Auth
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters long'),
    JWT_EXPIRES_IN: z.string().default('1d'),

    // Password reset
    RESET_TOKEN_EXPIRES_MIN: z.coerce.number().int().positive().default(30),

    // Security
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGIN: z.string().default('*'),
  })
  .passthrough();

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // Fail fast: a misconfigured environment should never boot.
  console.error(`❌ Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
