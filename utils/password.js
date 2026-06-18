// utils/password.js
// Thin wrapper around bcryptjs so the salt-round policy lives in one place.
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/** Hash a plaintext password. */
export const hashPassword = (plain) =>
  bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);

/** Compare a plaintext password against a stored hash. */
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
