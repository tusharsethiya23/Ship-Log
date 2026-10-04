// Checks GitHub for one user's activity on ONE streak day and records the day
// as "active" if there is any.
//
// This only ever ADDS good news. It never creates "missed" days: deciding a
// day was missed can only happen once the day is over, and that is the
// day-close service's work.

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { decrypt } from '../utils/crypto.js';
import { getTodayString, getDayWindow } from '../utils/time.js';
import { countCommits, countPrivateContributions } from './github.service.js';

// userId: which user to check.
// options.now:  can be passed in for tests; defaults to the real current time.
// options.date: check this specific day ("YYYY-MM-DD") instead of today.
//               The day-close service uses this for a final check on a day
//               that just ended.
export async function ingestUser(userId, { now = new Date(), date: forcedDate } = {}) {
  // The token is hidden from normal queries (select: false), so we ask for it
  // explicitly here with '+githubTokenEncrypted'.
  const user = await User.findById(userId).select('+githubTokenEncrypted');
  if (!user) return { skipped: 'user not found' };

  // A user needs at least one tracked repo, or the private activity option.
  const wantsPrivate = Boolean(user.countPrivateActivity);
  if (user.repos.length === 0 && !wantsPrivate) return { skipped: 'no repos tracked' };
  if (!user.githubTokenEncrypted) return { skipped: 'no GitHub token saved' };

  // Which streak day are we checking?
  const date = forcedDate ?? getTodayString(user.timezone, user.dayCutoffHour, now);

  // A closed day is final. Never change it.
  const existing = await Day.findOne({ userId: user._id, date });
  if (existing?.finalizedAt) return { date, skipped: 'day already closed' };

  const accessToken = decrypt(user.githubTokenEncrypted);
  const window = getDayWindow(date, user.timezone, user.dayCutoffHour);

  let commitCount = 0;
  const repoNames = []; // public repos that had commits that day
  const unreachable = []; // repos we couldn't read

  for (const repo of user.repos) {
    // Skip repos added AFTER this day ended. Commits earlier on the day the
    // repo was added still count, so testing on the same day works.
    if (window.end <= repo.trackedSince) continue;

    const result = await countCommits(accessToken, {
      fullName: repo.fullName,
      author: user.username,
      since: window.start,
      until: window.end,
    });

    if (result.status === 'unreachable') {
      unreachable.push(repo.fullName);
    } else if (result.count > 0) {
      commitCount += result.count;
      repoNames.push(repo.fullName);
    }
  }

  // Opt-in: add the private activity count GitHub reports for this day.
  // Only a number is stored: no private repo names.
  let privateCount = 0;
  if (wantsPrivate) {
    privateCount = await countPrivateContributions(accessToken, { since: window.start, until: window.end });
    commitCount += privateCount;
  }

  // Activity found: mark the day active. This also turns a claimed rest day
  // into an active day (commits always win), and creates the record if the
  // day has none yet (that's what `upsert: true` does).
  if (commitCount > 0) {
    await Day.updateOne(
      { userId: user._id, date },
      { $set: { status: 'active', commitCount, repoNames } },
      { upsert: true }
    );
  }

  return {
    date,
    commitCount,
    privateCount, // how many of those came from private activity
    // What the day looks like now: active, or whatever it already was
    // ('rest' if claimed), or 'none' if nothing has been recorded yet.
    status: commitCount > 0 ? 'active' : (existing?.status ?? 'none'),
    unreachable,
  };
}