// The web process entry point: connect to the database, start listening,
// and (in production) start the scheduled jobs in this same process.
// Run with: npm run dev --workspace server

import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

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
  logger.info(`Server listening on port ${env.PORT}`);
});

// In production there is only one service, so it runs the jobs too.
if (env.RUN_SCHEDULER) {
  startScheduler();
  logger.info('Scheduler started inside the web server');
}

// Graceful shutdown: when you press Ctrl+C (SIGINT) or a host stops the app
// (SIGTERM), stop the jobs, stop taking new requests, let current ones
// finish, close the database, then exit.
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  stopScheduler(); // safe to call even if it was never started
  httpServer.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  // Safety net: if something hangs, force quit after 10 seconds.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));