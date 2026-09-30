// Every run: queue posts for newly closed days, then send whatever is pending.

import { queuePosts, sendPendingPosts } from '../services/poster.service.js';
import { logger } from '../config/logger.js';

export async function runPosterJob() {
  const queued = await queuePosts();
  const { sent, failed, retrying } = await sendPendingPosts();

  // Stay quiet when nothing happened.
  if (queued || sent || failed || retrying) {
    logger.info('Poster job finished', { queued, sent, failed, retrying });
  }
}