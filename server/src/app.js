// Builds the Express app: which middleware runs, in which order, and where
// requests go. It does NOT start listening on a port (server.js does that).
// In production it also serves the built React app, so the website and the
// API share one address.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProduction } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Hosting platforms put a proxy in front of our app. This tells Express to
// trust it, so it sees the visitor's real IP and knows requests came over
// HTTPS (needed for rate limiting and secure cookies).
if (isProduction) app.set('trust proxy', 1);

// --- Security headers ---
// Helmet's default rules only allow images from our own address. Profile
// pictures come from GitHub, so that address is added to the allowed list.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https://avatars.githubusercontent.com'],
      },
    },
  })
);

// Only our React app's address may call this API from a browser.
// `credentials: true` allows cookies to travel with requests.
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// --- The built React app (production) ---
// `npm run build` puts the finished website in client/dist. If that folder
// exists, serve it. (On your computer during development it usually doesn't
// exist, because Vite serves the website on port 5173 instead.)
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));
if (hasClientBuild) {
  app.use(express.static(clientDist)); // before the logger, so file requests don't flood the log
}

// Reads JSON request bodies into req.body. The size limit blocks
// someone from sending a gigantic body to slow the server.
app.use(express.json({ limit: '100kb' }));

// Reads cookies from requests into req.cookies (needed for login).
app.use(cookieParser());

// A tiny request logger: prints "GET /health 200 3ms" after each response.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// --- Routes ---
app.use('/', routes);

// --- Single-page app fallback ---
// The React app handles addresses like /dashboard and /u/someone itself. If
// the server gets a page request it doesn't know, hand back the React app and
// let it decide. API, login, share and health addresses are NOT included, so
// a wrong one still gets a proper JSON 404.
if (hasClientBuild) {
  app.use((req, res, next) => {
    const isPageRequest = req.method === 'GET' && !/^\/(api|auth|share|health)(\/|$)/.test(req.path);
    if (!isPageRequest) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- Must stay LAST ---
app.use(notFound);
app.use(errorHandler);