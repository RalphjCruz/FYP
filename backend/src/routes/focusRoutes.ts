import { Router } from 'express';
import {
  completeFocusSessionController,
  resetFocusProgressDevController,
  settleFocusDayDevController,
  startFocusSessionDraftController,
  updateFocusProfileController,
} from '../controllers/focusController.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.post('/sessions/start', startFocusSessionDraftController);
router.post('/sessions/complete', completeFocusSessionController);
router.put('/profile', updateFocusProfileController);

if (env.nodeEnv !== 'production') {
  router.post('/dev/settle', settleFocusDayDevController);
  router.post('/dev/reset-progress', resetFocusProgressDevController);
} else {
  router.post('/dev/settle', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  router.post('/dev/reset-progress', (_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
}

export default router;
