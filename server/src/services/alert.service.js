// Sends YOU (the admin) a Discord message when something breaks, so a failing
// job doesn't go unnoticed. Uses ADMIN_ALERT_WEBHOOK from .env. If that is
// empty, alerts are switched off and this file does nothing.

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Remembers when each kind of alert was last sent.
const lastSent = new Map();
const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

// key:     names the kind of problem, e.g. 'crash:poster'. The same key is sent
//          at most once per cooldown, so a repeating failure can't flood you.
// message: what to tell you.
// This function never throws: a broken alert must not break the job that called it.
export async function alertAdmin(key, message, cooldownMs = DEFAULT_COOLDOWN_MS) {
  if (!env.ADMIN_ALERT_WEBHOOK) return;

  const last = lastSent.get(key) ?? 0;
  if (Date.now() - last < cooldownMs) return;
  lastSent.set(key, Date.now());

  try {
    await fetch(env.ADMIN_ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚠️ Ship Log: ${message}`.slice(0, 1900), // Discord's limit is 2000
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.warn('Could not send admin alert', err);
  }
}