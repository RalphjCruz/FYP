import { Router } from 'express';
import { exportAccountDataController } from '../controllers/accountController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/export', exportAccountDataController);

export default router;

