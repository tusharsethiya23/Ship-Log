// Actions for the logged-in user's own account.

import { User } from '../models/User.js';
import { logger } from '../config/logger.js';
import { decrypt } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';
import { getTodayString } from '../utils/time.js';
import { checkRepoAccess, listUserRepos } from '../services/github.service.js';

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
// save through rather than block the user. (The dropdown already prevents
// typos, so this is a safety net for requests that don't come from it.)
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

// Remembers each user's repo list for a minute, so reopening the dashboard
// doesn't call GitHub every time.
const repoListCache = new Map();
const REPO_CACHE_MS = 60_000;

// GET /api/me/github-repos
// The repos this user can choose from in the settings dropdown.
export async function getGithubRepos(req, res) {
  const key = String(req.user._id);
  const cached = repoListCache.get(key);
  if (cached && Date.now() - cached.at < REPO_CACHE_MS) {
    return res.json({ repos: cached.repos });
  }

  // The token is hidden from normal queries, so it is requested explicitly.
  const withToken = await User.findById(req.user._id).select('+githubTokenEncrypted');
  if (!withToken?.githubTokenEncrypted) {
    throw new HttpError(401, 'Your GitHub session expired. Please log in again.');
  }

  let repos;
  try {
    repos = await listUserRepos(decrypt(withToken.githubTokenEncrypted));
  } catch (err) {
    if (err.code === 'GITHUB_TOKEN_INVALID') {
      throw new HttpError(401, 'Your GitHub session expired. Please log in again.');
    }
    logger.warn('Could not list GitHub repos', err);
    throw new HttpError(502, 'Could not load your repos from GitHub. Try again in a moment.');
  }

  if (repoListCache.size > 500) repoListCache.clear(); // keep memory use small
  repoListCache.set(key, { at: Date.now(), repos });
  res.json({ repos });
}