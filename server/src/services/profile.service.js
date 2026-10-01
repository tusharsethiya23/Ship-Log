// Builds the data shown on a public profile page.
//
// Two sources are combined:
//   - the Streak summary, which only counts days that are already CLOSED
//   - today's Day record, which is still open and may already be "active"
// Adding them gives a live streak number that goes up the moment you commit.

import { User } from '../models/User.js';
import { Day } from '../models/Day.js';
import { Streak } from '../models/Streak.js';
import { createEmptyStreak } from './streak.service.js';
import { getTodayString } from '../utils/time.js';

// Finds a user by username. Only fields that are safe to make public are
// selected, so a mistake later can't leak anything else.
export async function findPublicUser(username) {
  return User.findOne({ username: username.toLowerCase() })
    .select('username avatarUrl timezone dayCutoffHour createdAt')
    .lean();
}

export async function buildProfile(user, now = new Date()) {
  const today = getTodayString(user.timezone, user.dayCutoffHour, now);

  // Three independent lookups, run at the same time.
  const [streakDoc, todayRecord, recentDays] = await Promise.all([
    Streak.findOne({ userId: user._id }).lean(),
    Day.findOne({ userId: user._id, date: today }).select('status').lean(),
    Day.find({ userId: user._id })
      .sort({ date: -1 }) // newest first
      .limit(14)
      .select('date status commitCount -_id')
      .lean(),
  ]);

  const base = streakDoc ?? createEmptyStreak();
  const todayStatus = todayRecord?.status ?? 'none'; // active | rest | none

  // Today isn't closed yet, so it isn't in the saved numbers. If it's already
  // active, count it now.
  const bonus = todayStatus === 'active' ? 1 : 0;
  const current = base.current + bonus;

  return {
    user: {
      username: user.username,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      memberSince: user.createdAt,
    },
    today,
    todayStatus,
    // True when there's a streak to lose and nothing has been done yet today.
    atRisk: todayStatus === 'none' && current > 0,
    streak: {
      current,
      longest: Math.max(base.longest, current),
      totalActive: base.totalActive + bonus,
      lastActiveDate: todayStatus === 'active' ? today : base.lastActiveDate,
      restUsedThisWeek: base.restUsedThisWeek,
    },
    recentDays,
  };
}

// Every recorded day in one calendar year, for the heatmap.
// Days with no record simply don't appear: the client draws them as empty.
export async function getYearCalendar(user, year) {
  return Day.find({
    userId: user._id,
    // "YYYY-MM-DD" strings sort correctly as text, so range queries work.
    date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
  })
    .sort({ date: 1 })
    .select('date status commitCount -_id')
    .lean();
}

// Added in Step 16: every recorded day from `startDate` onwards. The share
// card uses it to draw the mini heatmap.
export async function getDaysSince(user, startDate) {
  return Day.find({ userId: user._id, date: { $gte: startDate } })
    .select('date status -_id')
    .lean();
}