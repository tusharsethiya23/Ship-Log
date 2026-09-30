// The streak rules engine. It answers one question:
//   "Given a user's streak so far, and what happened on ONE day,
//    what does the streak look like now?"
//
// It is a set of PURE functions: same input always gives the same output,
// and nothing outside is touched (no database, no clock, no network).
// That is what makes it safe to test heavily, and streak logic is where
// bugs would hurt most.
//
// THE RULES
//   1. A day with at least one commit is ACTIVE: the streak grows by 1.
//   2. A day with no commits, where the user claimed the weekly rest day and
//      hasn't used it yet this week, is REST: the streak stays as it is.
//   3. Anything else is MISSED: the streak resets to 0.
//   4. Each week (Monday to Sunday) allows exactly ONE rest day.
//   5. Commits always win: if the user claimed a rest day but also committed,
//      the day counts as ACTIVE and the rest day is NOT spent.

import { addDays, daysBetween, getWeekStart } from '../utils/time.js';

// The starting point for a brand new user.
export function createEmptyStreak() {
  return {
    current: 0, // consecutive days right now
    longest: 0, // best streak ever
    totalActive: 0, // all active days (not necessarily consecutive)
    lastActiveDate: null, // last day with commits, or null if never
    weekStart: null, // Monday of the week we are tracking
    restUsedThisWeek: false, // has this week's rest day been spent?
  };
}

// Processes ONE day. The caller must feed days in date order, one at a time
// (the day-close job will do this).
//
//   state:  the streak before this day (see createEmptyStreak)
//   day:    { date: 'YYYY-MM-DD', hadCommits: boolean, restClaimed: boolean }
//
// Returns:
//   state:               the NEW streak (the input is never modified)
//   status:              'active' | 'rest' | 'missed'  (saved on the Day record)
//   broken:              true if this day just ended a running streak
//   brokenStreakLength:  how long the lost streak was (for the "broken" post)
export function applyDay(state, { date, hadCommits, restClaimed }) {
  // Work on a copy so the original object is never changed.
  // `{ ...state }` copies every field into a new object.
  const next = { ...state };

  // Has a new week started since the last day we processed?
  // If so, remember the new week and give the rest day back.
  const thisWeek = getWeekStart(date);
  if (next.weekStart !== thisWeek) {
    next.weekStart = thisWeek;
    next.restUsedThisWeek = false;
  }

  let status;
  let broken = false;

  if (hadCommits) {
    // Rule 1 (and 5): commits make the day active.
    status = 'active';
    next.current += 1;
    next.totalActive += 1;
    next.longest = Math.max(next.longest, next.current);
    next.lastActiveDate = date;
  } else if (restClaimed && !next.restUsedThisWeek) {
    // Rule 2: a valid rest day. The streak is kept but not increased.
    status = 'rest';
    next.restUsedThisWeek = true;
  } else {
    // Rule 3: missed. This includes a second rest claim in the same week.
    status = 'missed';
    // It only counts as "broken" if there was a streak to lose.
    broken = state.current > 0;
    next.current = 0;
  }

  return {
    state: next,
    status,
    broken,
    brokenStreakLength: broken ? state.current : 0,
  };
}

// Rebuilds the whole streak from saved Day records. This is what the
// rebuild script will use if the cached Streak document is ever wrong.
//
//   days: [{ date: 'YYYY-MM-DD', status: 'active' | 'rest' | 'missed' }, ...]
//
// If there are gaps between saved days (dates with no record), those dates
// are treated as missed days.
export function rebuildStreak(days) {
  // sort() changes the array it is called on, so we sort a copy.
  // Date strings in YYYY-MM-DD format sort correctly as plain text.
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let state = createEmptyStreak();
  let previousDate = null;

  for (const day of sorted) {
    if (previousDate) {
      // Fill in any skipped dates between the previous record and this one.
      const gap = daysBetween(previousDate, day.date);
      for (let i = 1; i < gap; i++) {
        const missedDate = addDays(previousDate, i);
        state = applyDay(state, { date: missedDate, hadCommits: false, restClaimed: false }).state;
      }
    }

    // A saved 'rest' day means the user had claimed it and it was valid.
    state = applyDay(state, {
      date: day.date,
      hadCommits: day.status === 'active',
      restClaimed: day.status === 'rest',
    }).state;

    previousDate = day.date;
  }

  return state;
}