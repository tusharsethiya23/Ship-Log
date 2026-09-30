// Talks to GitHub for the login flow. The full flow:
//   1. We send the user to GitHub's authorize page (buildAuthorizeUrl).
//   2. The user approves; GitHub sends them back to us with a one-time `code`.
//   3. We swap that code for an access token (exchangeCodeForToken).
//   4. We use the token to ask GitHub who this person is (fetchGitHubUser).
// Uses the built-in fetch (Node 18+), so no extra package is needed.

import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';

// The GitHub page where the user clicks "Authorize".
// `state` is a random value we also keep in a cookie, so we can prove later
// that the person coming back is the same one who started the login.
// We don't send redirect_uri: GitHub uses the callback URL registered
// in the OAuth app settings.
export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: 'read:user', // the minimum: read the basic profile
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

// Swaps the one-time code for a long-lived access token.
export async function exchangeCodeForToken(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json', // without this GitHub replies in a different format
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) throw new HttpError(502, 'Could not reach GitHub. Please try again.');

  const data = await res.json();
  // GitHub answers 200 even for errors (like an expired code), so check the body.
  if (data.error || !data.access_token) {
    throw new HttpError(400, `GitHub login failed: ${data.error_description ?? data.error ?? 'no token'}`);
  }
  return data.access_token;
}

// Asks GitHub "who owns this token?" and returns only what we need.
export async function fetchGitHubUser(accessToken) {
  const res = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ship-log', // GitHub's API requires a User-Agent header
    },
  });

  if (!res.ok) throw new HttpError(502, 'Could not read your GitHub profile.');

  const data = await res.json();
  return {
    githubId: String(data.id), // stored as text, matching the User model
    username: String(data.login),
    avatarUrl: data.avatar_url ?? '',
  };
}

// =======================
// ---------------------------------------------------------------------------
// Added in Step 9: counting a user's commits in one repo during a time span.
// ---------------------------------------------------------------------------

// GitHub wants timestamps like 2026-09-28T18:30:00Z, without milliseconds.
function toGitHubTime(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Counts commits made by `author` (a GitHub username) in `fullName`
// (like "owner/repo") between `since` and `until`.
//
// Returns { status, count } where status is:
//   'ok'          the repo was read (count may be 0)
//   'unreachable' GitHub said 404: the repo doesn't exist, or it's private and
//                 our token can't see it (we only asked for read:user)
//
// Throws for problems that need attention (expired token, rate limit, GitHub down).
// We look at one page of up to 100 commits, which is plenty for "did they
// commit today?". The count is capped at 100 for a single repo.
export async function countCommits(accessToken, { fullName, author, since, until }) {
  const params = new URLSearchParams({
    author,
    since: toGitHubTime(since),
    until: toGitHubTime(until),
    per_page: '100',
  });

  const res = await fetch(`https://api.github.com/repos/${fullName}/commits?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ship-log',
    },
  });

  // Repo not found, or private and not visible to us.
  if (res.status === 404) return { status: 'unreachable', count: 0 };

  // GitHub answers 409 for a repository that has no commits at all.
  if (res.status === 409) return { status: 'ok', count: 0 };

  // Our saved token was revoked or expired: the user must log in again.
  if (res.status === 401) {
    const err = new Error('GitHub token is no longer valid');
    err.code = 'GITHUB_TOKEN_INVALID';
    throw err;
  }

  if (!res.ok) {
    throw new Error(`GitHub responded with status ${res.status} for ${fullName}`);
  }

  const commits = await res.json();
  return { status: 'ok', count: commits.length };
}