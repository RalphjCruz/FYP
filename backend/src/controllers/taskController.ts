import { Response } from 'express';
import type { AuthenticatedRequest } from '../types/auth.js';
import {
  completeTaskForUser,
  createTaskForUser,
  deleteTaskForUser,
  getTasksByUserId,
  resetTasksForUser,
  updateTaskForUser,
} from '../services/taskService.js';
import { handleTaskControllerError } from './mappers/taskControllerErrorMapper.js';
import { requireAuthenticatedUserId } from './validators/requestAuth.js';
import {
  AUTH_MISMATCH_USER_ID,
  getTaskIdFromTaskRequest,
  getUserIdFromTaskRequest,
} from './validators/taskRequestValidators.js';

export const getTasksByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromTaskRequest(req);
    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const data = await getTasksByUserId(userId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to fetch tasks', 'Error fetching tasks:');
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromTaskRequest(req);
    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const data = await createTaskForUser(userId, req.body as Record<string, unknown>);

    return res.status(201).json({
      success: true,
      message: 'Task created',
      data,
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to create task', 'Error creating task:');
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromTaskRequest(req);
    const taskId = getTaskIdFromTaskRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    const data = await updateTaskForUser(userId, taskId, req.body as Record<string, unknown>);

    return res.json({
      success: true,
      message: 'Task updated',
      data,
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to update task', 'Error updating task:');
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromTaskRequest(req);
    const taskId = getTaskIdFromTaskRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    const { task, meta } = await completeTaskForUser(userId, taskId);

    return res.json({
      success: true,
      message: 'Task completed',
      data: task,
      meta,
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to complete task', 'Error completing task:');
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromTaskRequest(req);
    const taskId = getTaskIdFromTaskRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    await deleteTaskForUser(userId, taskId);

    return res.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to delete task', 'Error deleting task:');
  }
};

export const resetTasksDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const data = await resetTasksForUser(userId);

    return res.json({
      success: true,
      message: 'Tasks reset',
      data,
    });
  } catch (error) {
    return handleTaskControllerError(res, error, 'Failed to reset tasks', 'Error resetting tasks:');
  }
};
