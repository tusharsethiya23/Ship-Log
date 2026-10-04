// Every run: check GitHub for today's activity for every user who tracks a
// repo or has the private activity option turned on.

import { User } from '../models/User.js';
import { ingestUser } from '../services/ingest.service.js';
import { logger } from '../config/logger.js';

export async function runIngestJob() {
  // 'repos.0' exists only when the repos list has at least one item.
  const users = await User.find({
    $or: [{ 'repos.0': { $exists: true } }, { countPrivateActivity: true }],
  })
    .select('_id username')
    .lean();

  let checked = 0;
  let failed = 0;

  for (const user of users) {
    // One user's problem (expired token, GitHub hiccup) must never stop
    // the others, so each user gets their own try/catch.
    try {
      await ingestUser(user._id);
      checked += 1;
    } catch (err) {
      failed += 1;
      logger.warn(`Ingest failed for ${user.username}`, err);
    }
  }

  if (users.length > 0) logger.info('Ingest job finished', { checked, failed });
}