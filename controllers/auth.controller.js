// controllers/auth.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/response.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signToken,
  generateResetToken,
  hashResetToken,
} from '../utils/token.js';
import {
  createUser,
  findUserByEmailWithHash,
  setResetToken,
  findUserByResetTokenHash,
  updatePasswordAndClearReset,
} from '../models/user.model.js';

/** POST /auth/signup */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Surface a clean 409 instead of leaning on the DB unique-violation path.
  const existing = await findUserByEmailWithHash(email);
  if (existing) throw ApiError.conflict('Email is already registered');

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash });

  const token = signToken({ id: user.id, role: user.role });
  return created(res, { user, token });
});

/** POST /auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmailWithHash(email);
  // Generic message + always run a compare to avoid user-enumeration & timing leaks.
  const hash = user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = await comparePassword(password, hash);

  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ id: user.id, role: user.role });
  return ok(res, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  });
});

/** POST /auth/forgot-password — mock email by logging the reset link. */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const { rawToken, tokenHash, expiresAt } = generateResetToken();
  const updated = await setResetToken(email, tokenHash, expiresAt);

  if (updated) {
    // MOCK EMAIL: in production this would be sent via an email provider.
    console.log(
      `📧 [mock email] Password reset for ${email}\n` +
        `   Reset token: ${rawToken}\n` +
        `   Expires at:  ${expiresAt.toISOString()}`,
    );
  }

  // Always 200 regardless of whether the email exists (no enumeration).
  return ok(res, {
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

/** POST /auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const tokenHash = hashResetToken(token);
  const user = await findUserByResetTokenHash(tokenHash);
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  const passwordHash = await hashPassword(password);
  await updatePasswordAndClearReset(user.id, passwordHash);

  return ok(res, { message: 'Password has been reset successfully.' });
});
