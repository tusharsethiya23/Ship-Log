// Two "catch-all" pieces that sit at the END of the middleware chain.

import { HttpError } from '../utils/httpError.js';
import { logger } from '../config/logger.js';
import { isProduction } from '../config/env.js';

// 1. notFound: runs only if NO route matched the request.
//    It doesn't answer directly. It creates a 404 error and hands it to
//    the error handler below via next(error).
export function notFound(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// 2. errorHandler: every error in the app ends up here.
//    Express recognizes an error handler by its FOUR parameters
//    (err, req, res, next). Even if `next` is unused, it must stay in the list.
export function errorHandler(err, req, res, next) {
  // Pick the status code: our HttpError has one, invalid data from Mongoose
  // becomes 400, and anything unexpected becomes 500.
  let status = err.status ?? 500;
  if (err.name === 'ValidationError') status = 400;

  // Only log real server faults (5xx). A 404 or 400 is the client's mistake,
  // and logging every one would drown out the important errors.
  if (status >= 500) {
    logger.error('Unhandled error', err);
  }

  // In production, never leak internal error details for 5xx errors.
  const message =
    status >= 500 && isProduction ? 'Internal server error' : err.message;

  res.status(status).json({ error: { message } });
}