// Posts to Bluesky. Two calls each time:
//   1. createSession: log in with the handle + app password, get a short-lived token
//   2. createRecord:  create the post itself
// An "app password" is a separate password made just for apps like this one.
// It can be revoked without touching the main account password.

import { PostError } from './postError.js';

const API = 'https://bsky.social/xrpc';

// Sends one POST request to Bluesky and returns the JSON answer.
async function call(method, body, accessToken) {
  let res;
  try {
    res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Only the second call has a token.
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PostError('Could not reach Bluesky');
  }

  if (res.ok) return res.json();

  if (res.status === 401) {
    throw new PostError('Bluesky login failed. Check your handle and app password.', { permanent: true });
  }
  if (res.status === 400) {
    throw new PostError('Bluesky rejected the request', { permanent: true });
  }
  // 429 (rate limit) and 5xx (Bluesky is down) are worth retrying.
  throw new PostError(`Bluesky responded with status ${res.status}`);
}

function login(handle, appPassword) {
  return call('com.atproto.server.createSession', { identifier: handle, password: appPassword });
}

// Only checks that the login works. Used by the "Test" button so a test never
// publishes a public post.
export async function verifyBluesky({ handle, appPassword }) {
  await login(handle, appPassword);
}

// `link` is the profile URL inside the text. Bluesky does NOT turn plain text
// URLs into clickable links, so we mark that part of the text as a link
// ourselves (a "facet"). Positions are counted in BYTES, not characters,
// because emoji take more than one byte.
export async function sendBluesky({ handle, appPassword }, text, link) {
  const { accessJwt, did } = await login(handle, appPassword);

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  };

  const start = link ? text.indexOf(link) : -1;
  if (start !== -1) {
    const byteStart = Buffer.byteLength(text.slice(0, start), 'utf8');
    record.facets = [
      {
        index: { byteStart, byteEnd: byteStart + Buffer.byteLength(link, 'utf8') },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }],
      },
    ];
  }

  await call(
    'com.atproto.repo.createRecord',
    { repo: did, collection: 'app.bsky.feed.post', record },
    accessJwt
  );
}