import { Router } from 'express';
import { env } from '../config/env.js';
import {
  addCoinsDevController,
  claimDailyCoinsController,
  equipCustomizationItemController,
  getCustomizationOverviewController,
  resetCoinsDevController,
  resetCustomizationProgressDevController,
  unlockCustomizationItemController,
} from '../controllers/customizationController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', getCustomizationOverviewController);
router.post('/wallet/claim-daily', claimDailyCoinsController);
router.post('/items/unlock', unlockCustomizationItemController);
router.post('/items/equip', equipCustomizationItemController);

if (env.nodeEnv !== 'production') {
  router.post('/wallet/dev-add', addCoinsDevController);
  router.post('/wallet/dev-reset', resetCoinsDevController);
  router.post('/dev-reset-progress', resetCustomizationProgressDevController);
}

export default router;
