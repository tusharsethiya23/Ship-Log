// Claiming (and cancelling) today's rest day.
//
// A claimed rest day is saved as a Day record with status "rest" that is not
// finalized yet. Later, the day-close job sees it and applies the rest rule.
// If the user commits anyway, the ingest job will turn the day into "active"
// (commits always win), so claiming rest never costs anything.

import { Day } from '../models/Day.js';
import { HttpError } from '../utils/httpError.js';
import { addDays, getTodayString, getWeekStart } from '../utils/time.js';

// POST /api/rest-day
export async function claimRestDay(req, res) {
  const user = req.user;
  const today = getTodayString(user.timezone, user.dayCutoffHour);

  // The week (Monday to Sunday) that today belongs to.
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);

  // Was a rest day already used on a different day this week?
  // Date strings in YYYY-MM-DD form compare correctly as plain text.
  const usedThisWeek = await Day.exists({
    userId: user._id,
    status: 'rest',
    date: { $gte: weekStart, $lte: weekEnd, $ne: today },
  });
  if (usedThisWeek) {
    throw new HttpError(409, 'You already used your rest day this week.');
  }

  const existing = await Day.findOne({ userId: user._id, date: today });

  if (existing?.finalizedAt) {
    throw new HttpError(409, 'Today is already closed.');
  }
  if (existing?.status === 'active') {
    throw new HttpError(409, 'You already have commits today, so no rest day is needed.');
  }

  // Already claimed today: do nothing and report success (safe to click twice).
  if (!existing) {
    await Day.create({ userId: user._id, date: today, status: 'rest', commitCount: 0 });
  }

  res.status(201).json({ restDay: { date: today, status: 'rest' } });
}

// DELETE /api/rest-day
// Cancels today's claim, as long as the day hasn't been closed yet.
export async function cancelRestDay(req, res) {
  const user = req.user;
  const today = getTodayString(user.timezone, user.dayCutoffHour);

  const result = await Day.deleteOne({
    userId: user._id,
    date: today,
    status: 'rest',
    finalizedAt: null,
  });

  if (result.deletedCount === 0) {
    throw new HttpError(404, 'No open rest day to cancel today.');
  }
  res.json({ ok: true, date: today });
}