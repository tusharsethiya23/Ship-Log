// Actions for the logged-in user's own account.

import { getTodayString } from '../utils/time.js';

// Builds the object we send to the browser. Fields are listed by hand so
// nothing sensitive (encrypted tokens) can leak by accident.
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    dayCutoffHour: user.dayCutoffHour,
    repos: user.repos,
    countPrivateActivity: user.countPrivateActivity ?? false,
    blueskyHandle: user.integrations?.bluesky?.handle ?? '',
    // The user's current streak day, handy for the dashboard.
    today: getTodayString(user.timezone, user.dayCutoffHour),
  };
}

// GET /api/me
export function getMe(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

// PATCH /api/me
// Only the fields that were sent are changed. req.body was already checked
// by validate(updateMeSchema), so we can trust its shape here.
export async function updateMe(req, res) {
  const user = req.user;
  const { timezone, dayCutoffHour, repos, countPrivateActivity } = req.body;

  if (timezone !== undefined) user.timezone = timezone;
  if (dayCutoffHour !== undefined) user.dayCutoffHour = dayCutoffHour;
  if (countPrivateActivity !== undefined) user.countPrivateActivity = countPrivateActivity;

  if (repos !== undefined) {
    // Keep the original "trackedSince" date for repos that were already
    // tracked, so re-saving the list doesn't reset their start date.
    const existing = new Map(user.repos.map((r) => [r.fullName.toLowerCase(), r]));
    user.repos = repos.map((repo) => {
      const previous = existing.get(repo.fullName.toLowerCase());
      return {
        fullName: repo.fullName,
        isPrivate: repo.isPrivate ?? false,
        trackedSince: previous?.trackedSince ?? new Date(),
      };
    });
  }

  await user.save(); // runs the model's validation rules again
  res.json({ user: toPublicUser(user) });
}