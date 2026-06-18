// db/migrate.js
// Applies db/schema.sql to the configured database. Idempotent.
// Run with: npm run db:migrate
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, closePool } from '../config/db.js';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log(`✅ Schema applied to database "${env.PGDATABASE}"`);
}

// Only auto-run when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  migrate()
    .catch((err) => {
      console.error('❌ Migration failed:', err.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
