// Actions for the logged-in user's own account.

import { User } from '../models/User.js';
import { decrypt } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';
import { getTodayString } from '../utils/time.js';
import { checkRepoAccess } from '../services/github.service.js';

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

// Throws a 400 if any NEWLY added repo can't be found on GitHub. Repos that
// were already in the user's list are not rechecked, so saving other settings
// is never blocked by an old repo. If GitHub can't be reached, we let the
// save through rather than block the user.
async function rejectUnknownRepos(user, repos) {
  const known = new Set(user.repos.map((r) => r.fullName.toLowerCase()));
  const added = repos.filter((r) => !known.has(r.fullName.toLowerCase()));
  if (added.length === 0) return;

  // The token is hidden from normal queries, so it is requested explicitly.
  const withToken = await User.findById(user._id).select('+githubTokenEncrypted');
  if (!withToken?.githubTokenEncrypted) return;

  let token;
  try {
    token = decrypt(withToken.githubTokenEncrypted);
  } catch {
    return; // the saved token can't be opened (for example a changed key): skip the check
  }

  const missing = [];
  for (const repo of added) {
    if ((await checkRepoAccess(token, repo.fullName)) === 'not_found') missing.push(repo.fullName);
  }

  if (missing.length > 0) {
    throw new HttpError(
      400,
      `Can't find these public repos: ${missing.join(', ')}. Check the spelling. Private repos can't be read yet.`
    );
  }
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

  // Check new repos first, so a bad repo means NOTHING is changed.
  if (repos !== undefined) await rejectUnknownRepos(user, repos);

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