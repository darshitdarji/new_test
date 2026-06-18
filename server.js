// server.js
// Entry point: verify the DB connection, start the HTTP server, and shut down
// gracefully on signals.
import app from './app.js';
import { env } from './config/env.js';
import { assertDbConnection, closePool } from './config/db.js';

async function start() {
  await assertDbConnection();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await closePool();
      console.log('✅ Closed HTTP server and DB pool. Bye.');
      process.exit(0);
    });
    // Force-exit if connections don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
