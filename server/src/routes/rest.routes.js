// URLs under /api/rest-day. Requires a logged-in user.

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { claimRestDay, cancelRestDay } from '../controllers/rest.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', claimRestDay);
router.delete('/', cancelRestDay);

export default router;