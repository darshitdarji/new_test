// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Tests share one PostgreSQL database, so run files serially to avoid races.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./tests/setup.js'],
    // Injected before any app module (and dotenv) loads. dotenv won't override
    // these, so the suite always targets an isolated test database.
    env: {
      NODE_ENV: 'test',
      PGDATABASE: 'ecommerce_test',
      JWT_SECRET: 'test-secret-key-at-least-16-chars-long',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_SALT_ROUNDS: '4', // fast hashing for tests
      RESET_TOKEN_EXPIRES_MIN: '30',
    },
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
