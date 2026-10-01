// URLs under /share. Public: no login required.

import { Router } from 'express';
import { publicLimiter } from '../middleware/rateLimit.js';
import { sharePage, cardImage } from '../controllers/share.controller.js';

const router = Router();

router.use(publicLimiter);
router.get('/:username', sharePage);
router.get('/:username/card.png', cardImage);

export default router;