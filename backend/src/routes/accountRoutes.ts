import { Router } from 'express';
import {
  cancelAccountDeletionController,
  exportAccountDataController,
  getAccountDeletionStatusController,
  requestAccountDeletionController,
} from '../controllers/accountController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/export', exportAccountDataController);
router.get('/deletion/status', getAccountDeletionStatusController);
router.post('/deletion/request', requestAccountDeletionController);
router.post('/deletion/cancel', cancelAccountDeletionController);

export default router;
