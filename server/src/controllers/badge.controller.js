// Serves the streak badge image: GET /badge/:username/streak.svg
// Public: anyone can embed it, no login needed.

import { buildProfile, findPublicUser } from '../services/profile.service.js';
import { describeBadge, renderBadge } from '../services/badge.service.js';

// GitHub usernames: letters, numbers and dashes, up to 39 characters.
const USERNAME_PATTERN = /^[a-z0-9-]{1,39}$/i;

export async function streakBadge(req, res) {
  const { username } = req.params;
  const user = USERNAME_PATTERN.test(username) ? await findPublicUser(username) : null;

  // Unknown user: still answer with a badge image (saying so), not JSON.
  if (!user) {
    return res
      .status(404)
      .set('Cache-Control', 'public, max-age=60')
      .type('image/svg+xml')
      .send(renderBadge({ label: 'ship log', value: 'not found', color: '#6b7280' }));
  }

  const profile = await buildProfile(user);
  const { value, color } = describeBadge(profile);

  res
    // Other sites embed this image. GitHub and similar sites also keep their
    // own copy, so a badge can lag behind by a few minutes.
    .set('Cache-Control', 'public, max-age=300')
    // Allow pages on other websites to display the image.
    .set('Cross-Origin-Resource-Policy', 'cross-origin')
    .type('image/svg+xml')
    .send(renderBadge({ label: 'ship log', value, color }));
}