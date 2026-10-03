// Posts a message to a Discord channel through a webhook URL.
// A webhook is a private address: anyone who has it can post to that channel.

import { PostError } from './postError.js';

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

  // 429 = too many requests. Retrying later can work, so this is not permanent.
  if (res.status === 429) {
    // Discord's own limit answers with JSON. A block of the whole server
    // address (common on shared hosting) answers with a Cloudflare web page.
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
    throw new PostError(
      isJson
        ? `Discord rate limit hit. Try again in ${res.headers.get('retry-after') ?? 'a few'} seconds.`
        : 'Discord is blocking this server address for now (rate limit on shared hosting). It usually clears by itself.'
    );
  }

  throw new PostError(`Discord responded with status ${res.status}`);
}