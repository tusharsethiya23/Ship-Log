// Usage (from the project root):
//   npm run poster --workspace server
// Runs the queue + send steps once and prints what happened.

import { connectDB, disconnectDB } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { queuePosts, sendPendingPosts } from '../src/services/poster.service.js';

try {
  await connectDB();
  const queued = await queuePosts();
  const result = await sendPendingPosts();
  console.log(JSON.stringify({ queued, ...result }, null, 2));
} catch (err) {
  logger.error('run-poster failed', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}