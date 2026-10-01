// URLs under /share. Public: no login required.

import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';
import { sharePage } from '../controllers/share.controller.js';

const router = Router();

router.use(publicLimiter);
router.get('/:username', sharePage);

export default router;