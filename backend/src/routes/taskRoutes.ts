import { Router } from 'express';
import { completeTask, createTask, deleteTask, getTasksByUser, updateTask } from '../controllers/taskController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

// Current authenticated user routes
router.get('/', getTasksByUser);
router.post('/', createTask);
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
