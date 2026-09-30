// URLs under /api/me. Every route here requires a logged-in user.

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../validators/me.schema.js';
import { getMe, updateMe } from '../controllers/me.controller.js';

const router = Router();

router.use(requireAuth); // runs before every route in this file
router.get('/', getMe);
router.patch('/', validate(updateMeSchema), updateMe);

export default router;