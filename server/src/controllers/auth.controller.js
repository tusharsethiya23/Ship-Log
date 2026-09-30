// The three login-related actions: start login, finish login, log out.

import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { encrypt } from '../utils/crypto.js';
import {
  COOKIE_NAME,
  STATE_COOKIE_NAME,
  sessionCookieOptions,
  stateCookieOptions,
  signSession,
} from '../utils/token.js';
import { buildAuthorizeUrl, exchangeCodeForToken, fetchGitHubUser } from '../services/github.service.js';

// GET /auth/github
// Step 1: make a random `state`, remember it in a cookie, and send the
// browser to GitHub.
export function startLogin(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE_NAME, state, stateCookieOptions);
  res.redirect(buildAuthorizeUrl(state));
}

// GET /auth/github/callback?code=...&state=...
// GitHub sends the user back here after they approve (or cancel).
export async function handleCallback(req, res) {
  const { code, state, error } = req.query;

  // The user clicked "Cancel" on GitHub's page.
  if (error) {
    return res.redirect(`${env.CLIENT_URL}/?login=denied`);
  }

  // Compare the state GitHub returned with the one we stored in the cookie.
  // If they differ, this request did not come from a login we started.
  const savedState = req.cookies[STATE_COOKIE_NAME];
  res.clearCookie(STATE_COOKIE_NAME); // it is single-use, so remove it now
  if (typeof code !== 'string' || typeof state !== 'string' || !savedState || state !== savedState) {
    throw new HttpError(400, 'Invalid login attempt. Please start again.');
  }

  // Swap the code for a token, then ask GitHub who the user is.
  const accessToken = await exchangeCodeForToken(code);
  const profile = await fetchGitHubUser(accessToken);

  // "Upsert": update the user if they exist, create them if they don't.
  // We match on githubId (never changes), and refresh the username and
  // avatar in case the user changed them on GitHub.
  const user = await User.findOneAndUpdate(
    { githubId: profile.githubId },
    {
      $set: {
        username: profile.username.toLowerCase(),
        avatarUrl: profile.avatarUrl,
        githubTokenEncrypted: encrypt(accessToken), // saved encrypted, never as plain text
      },
    },
    {
      upsert: true, // create if not found
      new: true, // return the updated document
      setDefaultsOnInsert: true, // fill in defaults (timezone: UTC, etc.) for new users
    }
  );

  // Log them in: put the signed token in an httpOnly cookie, then send the
  // browser to the dashboard page of the React app.
  res.cookie(COOKIE_NAME, signSession(user._id), sessionCookieOptions);
  res.redirect(`${env.CLIENT_URL}/dashboard`);
}

// POST /auth/logout
// Deletes the login cookie.
export function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}