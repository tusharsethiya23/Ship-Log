// Closes (finalizes) every finished day for ONE user.
//
// A day is "finished" once the user's clock has moved past it. Closing a day:
//   1. does a last GitHub check for that day (catches late commits)
//   2. decides its final status: active / rest / missed
//   3. saves it as final (finalizedAt), plus the streak numbers after it
//   4. updates the user's Streak summary
//
// It is safe to run over and over: closed days are never touched again, and
// a user who has nothing to close is skipped quickly.

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { Streak } from '../models/streak.js';
import { addDays, getTodayString } from '../utils/time.js';
import { applyDay, rebuildStreak } from './streak.service.js';
import { ingestUser } from './ingest.service.js';

// Safety limit so a huge gap (worker was off for a year) can't loop forever.
const MAX_DAYS_PER_RUN = 400;

// `now` can be passed in for tests; it defaults to the real current time.
export async function closeDaysForUser(userId, now = new Date()) {
  const user = await User.findById(userId);
  if (!user) return { closed: [] };

  // The user's current (still open) streak day.
  const today = getTodayString(user.timezone, user.dayCutoffHour, now);

  // Days that are already final. These are the source of truth.
  const finalized = await Day.find({ userId: user._id, finalizedAt: { $ne: null } })
    .select('date status')
    .lean();

  // Where do we start closing?
  //   - right after the last closed day, or
  //   - for a brand new user, on the day they signed up (days before that
  //     don't count against them).
  let date;
  if (finalized.length > 0) {
    const lastClosed = finalized.reduce((max, d) => (d.date > max ? d.date : max), finalized[0].date);
    date = addDays(lastClosed, 1);
  } else {
    date = getTodayString(user.timezone, user.dayCutoffHour, user.createdAt);
  }

  // Nothing has finished yet. (YYYY-MM-DD strings compare correctly as text.)
  if (date >= today) return { closed: [] };

  // Rebuild the streak from the closed days instead of trusting the saved
  // summary. If an earlier run crashed halfway, this repairs itself.
  let state = rebuildStreak(finalized);

  const closed = [];
  while (date < today && closed.length < MAX_DAYS_PER_RUN) {
    // Last GitHub check for this day. If GitHub fails, this throws and we stop
    // here WITHOUT closing the day, so a GitHub outage never breaks a streak.
    // The next run tries again.
    await ingestUser(user._id, { date });

    // What do we know about this day? It may be 'active' (commits found),
    // 'rest' (claimed), or have no record at all.
    const record = await Day.findOne({ userId: user._id, date });

    const result = applyDay(state, {
      date,
      hadCommits: record?.status === 'active',
      restClaimed: record?.status === 'rest',
    });
    state = result.state;

    // Lock the day in. `upsert: true` creates the record for missed days,
    // since nothing exists yet for a day with no commits and no rest claim.
    await Day.updateOne(
      { userId: user._id, date },
      {
        $set: {
          status: result.status,
          commitCount: record?.commitCount ?? 0,
          finalizedAt: new Date(),
          streakAfter: state.current,
          brokenStreakLength: result.brokenStreakLength,
        },
      },
      { upsert: true }
    );

    // Save the streak summary after every day, so a crash loses at most one.
    await Streak.updateOne({ userId: user._id }, { $set: { ...state } }, { upsert: true });

    closed.push({
      date,
      status: result.status,
      broken: result.broken,
      brokenStreakLength: result.brokenStreakLength,
      streakAfter: state.current,
    });

    date = addDays(date, 1);
  }

  return { closed, streak: state };
}