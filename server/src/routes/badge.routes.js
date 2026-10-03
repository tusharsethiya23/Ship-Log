// URLs under /badge. Public: no login required.

import { Router } from 'express';
import { badgeLimiter } from '../middleware/rateLimit.js';
import { streakBadge } from '../controllers/badge.controller.js';

const router = Router();

router.use(badgeLimiter);
router.get('/:username/streak.svg', streakBadge);

export default router;