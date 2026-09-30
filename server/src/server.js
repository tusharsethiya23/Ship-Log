// The web process entry point: connect to the database, then start listening.
// Run with: npm run dev --workspace server

import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';

// Don't accept web requests until the database is ready.
try {
  await connectDB();
} catch (err) {
  logger.error('Could not connect to MongoDB, exiting', err);
  process.exit(1);
}

// Start accepting requests. listen() returns the underlying HTTP server,
// which we keep so we can close it politely on shutdown.
const httpServer = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

// Graceful shutdown: when you press Ctrl+C (SIGINT) or a host stops the app
// (SIGTERM), stop taking new requests, let current ones finish, close the
// database, then exit. This avoids cutting a request off halfway.
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  httpServer.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  // Safety net: if something hangs, force quit after 10 seconds.
  // .unref() means this timer alone won't keep the process alive.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));