// Limits how often one visitor (identified by IP address) can call a route.
// Public routes need this because anyone on the internet can reach them.

import rateLimit from 'express-rate-limit';
import { HttpError } from '../utils/httpError.js';

// Builds a limiter: up to `limit` requests per `windowMs` per visitor.
function makeLimiter(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7', // tells clients how many requests they have left
    legacyHeaders: false,
    // Send our normal JSON error shape instead of plain text.
    handler: (req, res, next) => {
      next(new HttpError(429, 'Too many requests. Please slow down.'));
    },
  });
}

// Public pages and profiles: 60 per minute.
export const publicLimiter = makeLimiter(60 * 1000, 60);

// Login routes: 30 per 15 minutes. Stops people hammering the GitHub login.
export const authLimiter = makeLimiter(15 * 60 * 1000, 30);

// Logged-in routes (settings, sync, rest day): 120 per minute.
export const apiLimiter = makeLimiter(60 * 1000, 120);

// Badges embedded in READMEs are requested by services that share a few
// addresses between many people, so they get a higher limit: 300 per minute.
export const badgeLimiter = makeLimiter(60 * 1000, 300);