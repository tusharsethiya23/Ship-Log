// "Check GitHub for my commits right now." Handy for testing, and later for
// a "Refresh" button on the dashboard.

import { ingestUser } from '../services/ingest.service.js';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../config/logger.js';

// Remembers when each user last synced, to stop people hammering GitHub.
// (Kept in memory, so it resets when the server restarts. That's fine here.)
const lastSync = new Map();
const COOLDOWN_MS = 15_000;

// POST /api/sync
export async function syncNow(req, res) {
  const key = String(req.user._id);
  const last = lastSync.get(key) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait a few seconds before syncing again.');
  }
  lastSync.set(key, Date.now());

  try {
    const result = await ingestUser(req.user._id);
    res.json({ sync: result });
  } catch (err) {
    if (err.code === 'GITHUB_TOKEN_INVALID') {
      throw new HttpError(401, 'Your GitHub session expired. Please log in again.');
    }
    logger.error('Sync failed', err);
    throw new HttpError(502, 'Could not read commits from GitHub. Try again later.');
  }
}