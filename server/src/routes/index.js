// The route table: the one file that lists every URL our API answers.

import { Router } from 'express';
import mongoose from 'mongoose';
import { apiLimiter, authLimiter } from '../middleware/rateLimit.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import restRoutes from './rest.routes.js';
import syncRoutes from './sync.routes.js';
import profileRoutes from './profile.routes.js';
import shareRoutes from './share.routes.js';
import badgeRoutes from './badge.routes.js';

const router = Router();

// GET /health: "is the server alive?" check. Deliberately not rate limited,
// so uptime monitors can check it as often as they like.
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

router.use('/auth', authLimiter, authRoutes); // login and logout
router.use('/api/me', apiLimiter, meRoutes); // the logged-in user's own data
router.use('/api/rest-day', apiLimiter, restRoutes); // claim or cancel today's rest day
router.use('/api/sync', apiLimiter, syncRoutes); // check GitHub for today's commits now
router.use('/api/u', profileRoutes); // PUBLIC profiles and calendars (has its own limiter)
router.use('/share', shareRoutes); // PUBLIC link-preview pages (has its own limiter)
router.use('/badge', badgeRoutes); // PUBLIC streak badge images (has its own limiter)

export default router;