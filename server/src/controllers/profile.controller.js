// Handlers for the public profile routes. No login needed for any of these.

import { HttpError } from '../utils/httpError.js';
import { getTodayString } from '../utils/time.js';
import { buildProfile, findPublicUser, getYearCalendar } from '../services/profile.service.js';

// GitHub usernames: letters, numbers and dashes, up to 39 characters.
// Rejecting anything else up front keeps odd input away from the database.
const USERNAME_PATTERN = /^[a-z0-9-]{1,39}$/i;

// Loads the user named in the URL, or throws a 404.
async function loadUser(req) {
  const { username } = req.params;
  if (!USERNAME_PATTERN.test(username)) throw new HttpError(404, 'User not found');

  const user = await findPublicUser(username);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

// GET /api/u/:username
export async function getProfile(req, res) {
  const user = await loadUser(req);
  res.json(await buildProfile(user));
}

// GET /api/u/:username/calendar?year=2026
export async function getCalendar(req, res) {
  const user = await loadUser(req);

  // Default to the current year in the user's own timezone.
  const currentYear = Number(getTodayString(user.timezone, user.dayCutoffHour).slice(0, 4));
  const year = req.query.year === undefined ? currentYear : Number(req.query.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HttpError(400, 'year must be a number between 2000 and 2100');
  }

  res.json({ year, days: await getYearCalendar(user, year) });
}