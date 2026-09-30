// URLs under /api/sync. Requires a logged-in user.

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { syncNow } from '../controllers/sync.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', syncNow);

export default router;