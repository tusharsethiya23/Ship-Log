// Checks GitHub for one user's commits made during their CURRENT streak day,
// and records the day as "active" if there are any.
//
// This only ever ADDS good news. It never creates "missed" days: deciding a
// day was missed can only happen once the day is over, and that is the
// day-close job's work (next step).

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { decrypt } from '../utils/crypto.js';
import { getTodayString, getDayWindow } from '../utils/time.js';
import { countCommits } from './github.service.js';

// `now` can be passed in for tests; it defaults to the real current time.
export async function ingestUser(userId, now = new Date()) {
  // The token is hidden from normal queries (select: false), so we ask for it
  // explicitly here with '+githubTokenEncrypted'.
  const user = await User.findById(userId).select('+githubTokenEncrypted');
  if (!user) return { skipped: 'user not found' };
  if (user.repos.length === 0) return { skipped: 'no repos tracked' };
  if (!user.githubTokenEncrypted) return { skipped: 'no GitHub token saved' };

  // Which streak day is it for this person right now?
  const date = getTodayString(user.timezone, user.dayCutoffHour, now);

  // A closed day is final. Never change it.
  const existing = await Day.findOne({ userId: user._id, date });
  if (existing?.finalizedAt) return { date, skipped: 'day already closed' };

  const accessToken = decrypt(user.githubTokenEncrypted);
  const window = getDayWindow(date, user.timezone, user.dayCutoffHour);

  let commitCount = 0;
  const repoNames = []; // repos that had commits today
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

  // Commits found: mark the day active. This also turns a claimed rest day
  // into an active day (commits always win), and creates the record if today
  // has none yet (that's what `upsert: true` does).
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
    // What today looks like now: active, or whatever it already was
    // ('rest' if claimed), or 'none' if nothing has been recorded yet.
    status: commitCount > 0 ? 'active' : (existing?.status ?? 'none'),
    unreachable,
  };
}