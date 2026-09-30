// URLs under /api/u. Public: no login required.

import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';
import { getProfile, getCalendar } from '../controllers/profile.controller.js';

const router = Router();

router.use(publicLimiter); // applies to every route in this file
router.get('/:username', getProfile);
router.get('/:username/calendar', getCalendar);

export default router;