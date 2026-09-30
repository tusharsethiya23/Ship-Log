// Everything about the login session in one place: creating the token,
// checking it, and the cookie settings used to store it in the browser.

import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';

// Name of the cookie that holds the login token.
export const COOKIE_NAME = 'shiplog_session';
// Name of the short-lived cookie used during the GitHub login handshake.
export const STATE_COOKIE_NAME = 'shiplog_oauth_state';

const SESSION_DAYS = 7;

// Creates a signed token that says "this browser belongs to user <id>".
// Only our server can create a valid one, because only we know JWT_SECRET.
export function signSession(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

// Checks the signature and expiry. Returns the token's contents, e.g.
// { sub: '<userId>', iat: ..., exp: ... }. Throws if it is fake or expired.
export function verifySession(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

// Cookie settings for the login cookie:
//   httpOnly: JavaScript in the page cannot read it (protects against theft)
//   secure:   only sent over HTTPS (turned on in production)
//   sameSite: 'lax' stops other websites from sending it in most cross-site requests
// NOTE: if you deploy the client and API on completely different domains
// (e.g. vercel.app and onrender.com), this needs sameSite: 'none'.
// Putting both under one domain (app.example.com / api.example.com) avoids that.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, // in milliseconds
};

// Same idea, but the state cookie only needs to live for 10 minutes.
export const stateCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000,
};