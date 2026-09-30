// Posts a message to a Discord channel through a webhook URL.
// A webhook is a private address: anyone who has it can post to that channel.

import { PostError } from './postError.js';

export async function sendDiscord(webhookUrl, text) {
  let res;
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        // Never let a post ping @everyone or @here, whatever the text says.
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(10_000), // give up after 10 seconds
    });
  } catch {
    // Network failure or timeout: worth retrying.
    throw new PostError('Could not reach Discord');
  }

  if (res.ok) return; // Discord answers 204 (no content) on success

  // 401/403/404 mean the webhook is wrong or was deleted: retrying can't fix that.
  if ([401, 403, 404].includes(res.status)) {
    throw new PostError('Discord webhook is invalid or was deleted', { permanent: true });
  }
  throw new PostError(`Discord responded with status ${res.status}`);
}