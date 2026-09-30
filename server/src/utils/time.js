// Small helpers for working with calendar dates written as "YYYY-MM-DD".
//
// Why not use normal Date objects everywhere? A Date is a moment in time, and
// "what day is it" changes with the timezone. Our streak rules only care about
// the calendar day, so we keep days as plain strings and do the math here.

import { DateTime } from 'luxon';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Pure calendar math. Uses UTC on purpose: UTC has no daylight-saving changes,
// so adding a day always adds exactly one calendar day.
// ---------------------------------------------------------------------------

// Turns "2026-09-29" into a Date object at midnight UTC.
// Throws if the text is not a real date. Without the second check,
// "2026-02-31" would silently roll over to March 3.
export function parseDateString(str) {
  if (typeof str !== 'string' || !DATE_PATTERN.test(str)) {
    throw new Error(`Invalid date string: ${str}`);
  }
  const [year, month, day] = str.split('-').map(Number);
  // Months are 0-based in JavaScript (0 = January), so we subtract 1.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (formatDateString(date) !== str) {
    throw new Error(`Date does not exist: ${str}`);
  }
  return date;
}

// Turns a Date back into "YYYY-MM-DD". toISOString() gives
// "2026-09-29T00:00:00.000Z", and we keep the first 10 characters.
export function formatDateString(date) {
  return date.toISOString().slice(0, 10);
}

// Adds (or subtracts, with a negative number) days to a date string.
export function addDays(str, amount) {
  const date = parseDateString(str);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateString(date);
}

// How many days from a to b. Positive if b is later, negative if earlier.
// A day is 86,400,000 milliseconds.
export function daysBetween(a, b) {
  const diff = parseDateString(b) - parseDateString(a);
  return Math.round(diff / 86_400_000);
}

// Returns the Monday of the week that contains the given date.
// Our rest-day rule is "one per week", and weeks start on Monday.
export function getWeekStart(str) {
  const date = parseDateString(str);
  // getUTCDay(): 0 = Sunday, 1 = Monday ... 6 = Saturday.
  // This formula converts that to "days since Monday" (Mon = 0 ... Sun = 6).
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(str, -daysSinceMonday);
}

// ---------------------------------------------------------------------------
// Working out "today" for a specific user.
// ---------------------------------------------------------------------------

// Checks that a timezone name like "Asia/Kolkata" is real.
// Intl.DateTimeFormat throws a RangeError for unknown timezones.
export function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Returns the user's current "streak day" as "YYYY-MM-DD".
//   timezone:   the user's IANA timezone, e.g. "Asia/Kolkata"
//   cutoffHour: hour (0-23) when their day ends. With 3, a commit at
//               1 a.m. still belongs to the previous day.
//   now:        can be passed in for tests; defaults to the real current time.
//
// How it works: move the clock back by cutoffHour hours, then read the
// calendar date in the user's timezone.
export function getTodayString(timezone, cutoffHour = 0, now = new Date()) {
  const shifted = new Date(now.getTime() - cutoffHour * 60 * 60 * 1000);
  // The "en-CA" locale formats dates as YYYY-MM-DD, exactly our format.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

// Added in Step 9.
// Returns the exact time span of one streak day, as two Date objects:
//   start = the moment the day begins (inclusive)
//   end   = the moment the next day begins (exclusive)
// We send these to GitHub to ask "which commits happened in this span?".
//
// Example: 2026-09-29 in Asia/Kolkata with cutoffHour 0 runs from
//   2026-09-28T18:30:00Z to 2026-09-29T18:30:00Z (India is UTC+5:30).
// With cutoffHour 3, both ends move 3 hours later.
//
// Luxon handles daylight saving for us, so a day can be 23 or 25 hours long
// in zones that have it.
export function getDayWindow(dateStr, timezone, cutoffHour = 0) {
  parseDateString(dateStr); // throws if the date text is invalid

  // Midnight at the start of that date, in the user's timezone.
  const midnight = DateTime.fromISO(dateStr, { zone: timezone });
  if (!midnight.isValid) {
    throw new Error(`Invalid date or timezone: ${dateStr} / ${timezone}`);
  }

  const start = midnight.plus({ hours: cutoffHour });
  const end = midnight.plus({ days: 1 }).plus({ hours: cutoffHour });

  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}