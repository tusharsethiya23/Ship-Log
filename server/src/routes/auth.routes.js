// URLs under /auth (mounted in routes/index.js).

import { Router } from 'express';
import { startLogin, handleCallback, logout } from '../controllers/auth.controller.js';

const router = Router();

router.get('/github', startLogin); // the "Login with GitHub" button points here
router.get('/github/callback', handleCallback); // GitHub sends the user back here
router.post('/logout', logout);

export default router;