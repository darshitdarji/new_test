// config/db.js
// Single shared PostgreSQL connection pool (node-postgres).
// Use `query()` for one-off statements and `getClient()` for transactions.
import pg from 'pg';
import { env, isProd } from './env.js';

const { Pool } = pg;

// Prefer a single DATABASE_URL when provided, otherwise assemble from parts.
const poolConfig = env.DATABASE_URL
  ? { connectionString: env.DATABASE_URL }
  : {
      host: env.PGHOST,
      port: env.PGPORT,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
    };

// Managed providers (Render, Supabase, Neon, …) require TLS.
if (env.PGSSL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // An idle client error should never crash the process silently.
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Run a parameterized query against the pool.
 * @param {string} text - SQL with $1, $2 … placeholders.
 * @param {Array} [params] - bound parameters.
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client for a transaction. Caller MUST release it.
 * @returns {Promise<import('pg').PoolClient>}
 */
export const getClient = () => pool.connect();

/**
 * Helper that runs `fn(client)` inside a BEGIN/COMMIT block and rolls back on error.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Verify connectivity at boot. Throws if the database is unreachable. */
export async function assertDbConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    if (!isProd) console.log('✅ Database connection OK');
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
