// URLs under /api/me. Every route here requires a logged-in user.

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../validators/me.schema.js';
import { saveIntegrationsSchema } from '../validators/integrations.schema.js';
import { deleteAccountSchema } from '../validators/account.schema.js';
import { getMe, updateMe } from '../controllers/me.controller.js';
import { getIntegrations, saveIntegrations, testIntegrations } from '../controllers/integrations.controller.js';
import { deleteAccount } from '../controllers/account.controller.js';

const router = Router();

router.use(requireAuth); // runs before every route in this file
router.get('/', getMe);
router.patch('/', validate(updateMeSchema), updateMe);
router.delete('/', validate(deleteAccountSchema), deleteAccount);

router.get('/integrations', getIntegrations);
router.patch('/integrations', validate(saveIntegrationsSchema), saveIntegrations);
router.post('/integrations/test', testIntegrations);

export default router;