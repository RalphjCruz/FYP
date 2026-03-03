import { Router } from 'express';
import { getMyAnalyticsSummary } from '../controllers/analyticsController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/me/summary', getMyAnalyticsSummary);

export default router;
