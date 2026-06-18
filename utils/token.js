// utils/token.js
// JWT issuance/verification and password-reset token generation.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Sign a JWT for a user.
 * @param {{ id: number|string, role: string }} payload
 */
export const signToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

/** Verify a JWT, throwing on invalid/expired tokens. */
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

/**
 * Generate a password-reset token. The raw token is emailed to the user;
 * only its sha256 hash is persisted, so a DB leak can't be used to reset.
 * @returns {{ rawToken: string, tokenHash: string, expiresAt: Date }}
 */
export const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.RESET_TOKEN_EXPIRES_MIN * 60 * 1000,
  );
  return { rawToken, tokenHash, expiresAt };
};

/** Deterministically hash a reset token for storage/lookup. */
export const hashResetToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');
