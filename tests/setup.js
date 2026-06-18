// tests/setup.js
// Runs once before the test suite (per worker). Ensures an isolated test
// database exists and the schema is applied.
import pg from 'pg';
import { beforeAll, afterAll } from 'vitest';
import { env } from '../config/env.js';
import { migrate } from '../db/migrate.js';
import { pool, closePool } from '../config/db.js';

const { Client } = pg;

/** Create the test database if it doesn't already exist (idempotent). */
async function ensureTestDatabase() {
  // Connect to the maintenance `postgres` database to issue CREATE DATABASE.
  const admin = new Client({
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: 'postgres',
    ssl: env.PGSSL ? { rejectUnauthorized: false } : undefined,
  });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.PGDATABASE],
    );
    if (rowCount === 0) {
      // Identifier can't be parameterized; env.PGDATABASE is developer-controlled.
      await admin.query(`CREATE DATABASE "${env.PGDATABASE}"`);
    }
  } finally {
    await admin.end();
  }
}

beforeAll(async () => {
  await ensureTestDatabase();
  await migrate();
});

afterAll(async () => {
  await closePool();
});

/** Wipe all data and reset identity sequences between tests. */
export async function resetDb() {
  await pool.query(
    'TRUNCATE order_items, orders, cart_items, wishlists, products, users RESTART IDENTITY CASCADE',
  );
}
