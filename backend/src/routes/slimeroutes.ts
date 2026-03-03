import { Router } from 'express';
import {
  addSlimeXpDev,
  createTestUser,
  getSlimeStats,
  healthCheck,
  resetSlimeAchievementsDev,
  resetSlimeXpDev,
} from '../controllers/slimeController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { env } from '../config/env.js';

type SlimeRouterConfig = {
  nodeEnv: string;
};

export const createSlimeRouter = (config: SlimeRouterConfig = env) => {
  const router = Router();

  // Health check
  router.get('/health', healthCheck);

  if (config.nodeEnv !== 'production') {
    // Create test user (development only)
    router.post('/test-user', createTestUser);
  } else {
    router.post('/test-user', (_req, res) => {
      return res.status(404).json({ success: false, message: 'Route not found' });
    });
  }

  // Current authenticated user slime
  router.get('/me', requireAuth, getSlimeStats);

  if (config.nodeEnv !== 'production') {
    router.post('/me/dev-xp', requireAuth, addSlimeXpDev);
    router.post('/me/dev-reset-xp', requireAuth, resetSlimeXpDev);
    router.post('/me/dev-reset-achievements', requireAuth, resetSlimeAchievementsDev);
  } else {
    router.post('/me/dev-xp', (_req, res) => {
      return res.status(404).json({ success: false, message: 'Route not found' });
    });
    router.post('/me/dev-reset-xp', (_req, res) => {
      return res.status(404).json({ success: false, message: 'Route not found' });
    });
    router.post('/me/dev-reset-achievements', (_req, res) => {
      return res.status(404).json({ success: false, message: 'Route not found' });
    });
  }

  // Get slime by user ID
  router.get('/:userId', requireAuth, getSlimeStats);

  return router;
};

export default createSlimeRouter();
