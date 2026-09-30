// The worker process entry point. It runs alongside the web server as a
// separate program. It serves no web pages: it only runs the scheduled jobs.
// Start it with: npm run dev:worker --workspace server

import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

try {
  await connectDB();
} catch (err) {
  logger.error('Worker could not connect to MongoDB, exiting', err);
  process.exit(1);
}

startScheduler();
logger.info('Worker started');

// Clean shutdown on Ctrl+C or when a host stops the app.
async function shutdown(signal) {
  logger.info(`${signal} received, worker shutting down`);
  stopScheduler();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));