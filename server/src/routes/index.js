// The route table: the one file that lists every URL our API answers.

import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import restRoutes from './rest.routes.js';
import syncRoutes from './sync.routes.js';
import profileRoutes from './profile.routes.js';

const router = Router();

// GET /health: "is the server alive?" check.
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

router.use('/auth', authRoutes); // login and logout
router.use('/api/me', meRoutes); // the logged-in user's own data
router.use('/api/rest-day', restRoutes); // claim or cancel today's rest day
router.use('/api/sync', syncRoutes); // check GitHub for today's commits now
router.use('/api/u', profileRoutes); // PUBLIC profiles and calendars

export default router;