// models/user.model.js
// All SQL touching the `users` table. Returns plain row objects.
import { query } from '../config/db.js';

// Columns that are safe to return to clients (never the hash or reset token).
const PUBLIC_COLS = 'id, name, email, role, created_at';

/** Create a new user and return the public projection. */
export async function createUser({ name, email, passwordHash, role = 'customer' }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLS}`,
    [name, email, passwordHash, role],
  );
  return rows[0];
}

/** Full row (including password_hash) — for credential checks only. */
export async function findUserByEmailWithHash(email) {
  const { rows } = await query(
    `SELECT id, name, email, role, password_hash
       FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

/** Public projection by id — used by auth middleware. */
export async function findUserById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

/** Store a reset-token hash and its expiry for a given email (if it exists). */
export async function setResetToken(email, tokenHash, expiresAt) {
  const { rows } = await query(
    `UPDATE users
        SET reset_token_hash = $2,
            reset_token_expires_at = $3,
            updated_at = now()
      WHERE email = $1
      RETURNING id`,
    [email, tokenHash, expiresAt],
  );
  return rows[0] || null;
}

/** Find a user by a non-expired reset-token hash. */
export async function findUserByResetTokenHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, email
       FROM users
      WHERE reset_token_hash = $1
        AND reset_token_expires_at > now()`,
    [tokenHash],
  );
  return rows[0] || null;
}

/** Set a new password and clear the reset token in one statement. */
export async function updatePasswordAndClearReset(userId, passwordHash) {
  await query(
    `UPDATE users
        SET password_hash = $2,
            reset_token_hash = NULL,
            reset_token_expires_at = NULL,
            updated_at = now()
      WHERE id = $1`,
    [userId, passwordHash],
  );
}
