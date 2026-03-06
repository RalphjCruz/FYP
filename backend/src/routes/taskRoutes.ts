import { Router } from 'express';
import { completeTask, createTask, deleteTask, getTasksByUser, resetTasksDev, updateTask } from '../controllers/taskController.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

// Current authenticated user routes
router.get('/', getTasksByUser);
router.post('/', createTask);
if (env.nodeEnv !== 'production') {
  router.post('/dev-reset', resetTasksDev);
} else {
  router.post('/dev-reset', (_req, res) => {
    return res.status(404).json({ success: false, message: 'Route not found' });
  });
}
router.post('/:taskId/complete', completeTask);
router.patch('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

// Backward-compatible routes (will be removed once frontend fully migrates)
router.get('/:userId', getTasksByUser);
router.post('/:userId', createTask);
router.post('/:userId/:taskId/complete', completeTask);
router.patch('/:userId/:taskId', updateTask);
router.delete('/:userId/:taskId', deleteTask);

export default router;
