// Limits how often one visitor (identified by IP address) can call a route.
// Public routes need this because anyone on the internet can reach them.

import rateLimit from 'express-rate-limit';
import { HttpError } from '../utils/httpError.js';

// Up to 60 requests per minute per visitor.
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7', // tells clients how many requests they have left
  legacyHeaders: false,
  // Send our normal JSON error shape instead of plain text.
  handler: (req, res, next) => {
    next(new HttpError(429, 'Too many requests. Please slow down.'));
  },
});