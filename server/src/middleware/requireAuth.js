// Put this in front of any route that needs a logged-in user.
// If the request has a valid login cookie, it loads the user and stores it in
// req.user so the route can use it. Otherwise it stops with a 401 error.

import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { COOKIE_NAME, verifySession } from '../utils/token.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) throw new HttpError(401, 'Not logged in');

  let payload;
  try {
    payload = verifySession(token);
  } catch {
    // Fake, tampered, or expired token.
    throw new HttpError(401, 'Session expired. Please log in again.');
  }

  // The token only holds the user's id, so load the full user from the database.
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account not found');

  req.user = user;
  next(); // continue to the actual route
}