import { Router } from 'express';
import { getGlobalLeaderboardController } from '../controllers/leaderboardController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/global', getGlobalLeaderboardController);

export default router;
