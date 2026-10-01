// Posts to Bluesky. Each post takes a few calls:
//   1. createSession: log in with the handle + app password, get a short-lived token
//   2. uploadBlob:    (optional) upload the streak card picture
//   3. createRecord:  create the post itself
// An "app password" is a separate password made just for apps like this one.
// It can be revoked without touching the main account password.

import { PostError } from './postError.js';

const API = 'https://bsky.social/xrpc';

// Bluesky refuses pictures of about 1 MB or more. Our card is far smaller.
const MAX_IMAGE_BYTES = 950_000;

// Sends one POST request to Bluesky and returns the JSON answer.
async function call(method, body, accessToken) {
  let res;
  try {
    res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Only the later calls have a token.
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

// Uploads the card picture. Returns the "blob" reference Bluesky wants in the
// post, or null if anything goes wrong. A missing picture should never stop a
// post, so failures are quiet here.
async function uploadImage(png, accessToken) {
  if (!png || png.length > MAX_IMAGE_BYTES) return null;
  try {
    const res = await fetch(`${API}/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${accessToken}` },
      body: png, // the raw picture bytes, not JSON
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return (await res.json()).blob;
  } catch {
    return null;
  }
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
//
// `card` (optional) is { png, title, description }. When given, the post also
// shows a preview card with that picture, title and description.
export async function sendBluesky({ handle, appPassword }, text, link, card = null) {
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

  // The preview card under the post.
  if (card && link) {
    const thumb = await uploadImage(card.png, accessJwt);
    record.embed = {
      $type: 'app.bsky.embed.external',
      external: {
        uri: link,
        title: card.title,
        description: card.description,
        ...(thumb ? { thumb } : {}), // the picture is optional
      },
    };
  }

  await call(
    'com.atproto.repo.createRecord',
    { repo: did, collection: 'app.bsky.feed.post', record },
    accessJwt
  );
}