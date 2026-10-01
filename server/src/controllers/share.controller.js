// The share page: a tiny HTML page whose only job is to carry "preview tags"
// (Open Graph tags). Apps like Discord read these tags to build a preview
// card when someone pastes the link. They don't run our React app, which is
// why the tags can't live there. People who open the link are sent on to the
// real profile page straight away.

import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { buildProfile, findPublicUser } from '../services/profile.service.js';

const USERNAME_PATTERN = /^[a-z0-9-]{1,39}$/i;

// Makes text safe to put inside HTML, so odd characters can't break the page.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET /share/:username
export async function sharePage(req, res) {
  const { username } = req.params;
  if (!USERNAME_PATTERN.test(username)) throw new HttpError(404, 'User not found');

  const user = await findPublicUser(username);
  if (!user) throw new HttpError(404, 'User not found');

  const { streak } = await buildProfile(user);

  const title =
    streak.current > 0
      ? `@${user.username} is on a ${streak.current}-day streak 🔥`
      : `@${user.username} on Ship Log`;
  const description = `${streak.longest} longest · ${streak.totalActive} active days. Shipping code, in public.`;

  // Where real visitors end up: the profile page in the React app.
  const profileLink = `${env.CLIENT_URL}/u/${user.username}`;
  const shareLink = `${env.CLIENT_URL}/share/${user.username}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Ship Log" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(shareLink)}" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />

  <meta http-equiv="refresh" content="0; url=${escapeHtml(profileLink)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(profileLink)}">@${escapeHtml(user.username)} on Ship Log</a>...</p>
</body>
</html>`;

  // Previews are fetched by bots often, so let them reuse a copy for 5 minutes.
  res.set('Cache-Control', 'public, max-age=300').type('html').send(html);
}