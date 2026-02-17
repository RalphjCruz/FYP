import { Router } from 'express';
import { completeTask, createTask, deleteTask, getTasksByUser, updateTask } from '../controllers/taskController';

const router = Router();

// Get all tasks for a user
router.get('/:userId', getTasksByUser);

// Create a task for a user
router.post('/:userId', createTask);

// Complete a task
router.post('/:userId/:taskId/complete', completeTask);

// Update a task
router.patch('/:userId/:taskId', updateTask);

// Delete a task
router.delete('/:userId/:taskId', deleteTask);

export default router;
