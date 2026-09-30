// Builds the Express app: which middleware runs, in which order, and where
// requests go. It does NOT start listening on a port (server.js does that).
// Keeping the two apart lets us test the app without opening a port.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, isProduction } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';

export const app = express();

// Hosting platforms put a proxy in front of our app. This tells Express to
// trust it, so it sees the visitor's real IP and knows requests came over
// HTTPS. Needed later for rate limiting and secure cookies.
if (isProduction) app.set('trust proxy', 1);

// --- Middleware ---
// Middleware = a function that runs on every request, in the order written
// below. Each one can change the request, respond early, or call next()
// to pass control along.

// Adds security headers (blocks clickjacking, sniffing, and similar attacks).
app.use(helmet());

// Only our React app's address may call this API from a browser.
// `credentials: true` allows cookies to travel with requests, which we need
// for the login cookie later.
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// Reads JSON request bodies into req.body. The size limit blocks
// someone from sending a gigantic body to slow the server.
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// A tiny request logger (instead of installing a package):
// prints "GET /health 200 3ms" after each response is sent.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// --- Routes ---
app.use('/', routes);

// --- Must stay LAST ---
// If no route above answered, this creates a 404, then the error handler
// formats it. Order matters: these only work because they come after routes.
app.use(notFound);
app.use(errorHandler);