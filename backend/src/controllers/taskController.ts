import { Request, Response } from 'express';
import pool from '../config/database.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { addXpToSlimeWithClient } from '../services/xpService.js';

type TaskDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_XP: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const getParamValue = (value: string | string[] | undefined, fallback = ''): string => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
};

const parsePositiveInt = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeDifficulty = (value: unknown): TaskDifficulty | null => {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return null;
};

const mapTask = (row: Record<string, unknown>) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  title: String(row.title),
  description: row.description ? String(row.description) : '',
  difficulty: normalizeDifficulty(row.priority) ?? 'medium',
  status: String(row.status),
  xpReward: Number(row.experience_reward),
  createdAt: String(row.created_at),
  completedAt: row.completed_at ? String(row.completed_at) : null,
});

const AUTH_MISMATCH_USER_ID = -1;

const getUserIdFromRequest = (req: AuthenticatedRequest): number | null => {
  const authenticatedUserId = req.user?.id ?? null;
  const userIdParam = getParamValue(req.params.userId);
  const routeUserId = parsePositiveInt(userIdParam);

  if (authenticatedUserId !== null) {
    if (routeUserId !== null && routeUserId !== authenticatedUserId) {
      return AUTH_MISMATCH_USER_ID;
    }

    return authenticatedUserId;
  }

  return routeUserId;
};

const getTaskIdFromRequest = (req: Request): number | null => {
  const taskIdParam = getParamValue(req.params.taskId);
  return parsePositiveInt(taskIdParam);
};

export const getTasksByUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => mapTask(row)),
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tasks',
    });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const difficulty = normalizeDifficulty(req.body.difficulty) ?? 'medium';

    if (title.length === 0) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const xpReward = DIFFICULTY_XP[difficulty];

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, status, experience_reward)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [userId, title, description || null, difficulty, xpReward],
    );

    return res.status(201).json({
      success: true,
      message: 'Task created',
      data: mapTask(result.rows[0]),
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create task',
    });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const taskId = getTaskIdFromRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    const hasTitle = typeof req.body.title === 'string';
    const hasDescription = typeof req.body.description === 'string';
    const difficulty = normalizeDifficulty(req.body.difficulty);

    const title = hasTitle ? req.body.title.trim() : null;
    const description = hasDescription ? req.body.description.trim() : null;

    if (hasTitle && (!title || title.length === 0)) {
      return res.status(400).json({ success: false, message: 'Task title cannot be empty' });
    }

    const xpReward = difficulty ? DIFFICULTY_XP[difficulty] : null;

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           priority = COALESCE($5, priority),
           experience_reward = COALESCE($6, experience_reward),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = $2
       RETURNING *`,
      [userId, taskId, title, description, difficulty, xpReward],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({
      success: true,
      message: 'Task updated',
      data: mapTask(result.rows[0]),
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task',
    });
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const taskId = getTaskIdFromRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingTaskResult = await client.query(
        `SELECT *
         FROM tasks
         WHERE user_id = $1 AND id = $2
         FOR UPDATE`,
        [userId, taskId],
      );

      if (existingTaskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const existingTask = existingTaskResult.rows[0] as Record<string, unknown>;
      if (String(existingTask.status) === 'completed') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Task already completed' });
      }

      const updatedTaskResult = await client.query(
        `UPDATE tasks
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        [userId, taskId],
      );

      const taskRow = updatedTaskResult.rows[0] as Record<string, unknown>;
      const xpReward = Number(taskRow.experience_reward ?? 0);
      const xpSnapshot =
        xpReward > 0 ? await addXpToSlimeWithClient(client, userId, xpReward, 'task_complete') : null;

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Task completed',
        data: mapTask(taskRow),
        meta: xpSnapshot
          ? {
              xpAwarded: xpReward,
              slimeLevel: xpSnapshot.level,
              totalExperience: xpSnapshot.totalExperience,
            }
          : undefined,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete task',
    });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const taskId = getTaskIdFromRequest(req);

    if (userId === AUTH_MISMATCH_USER_ID) {
      return res.status(403).json({ success: false, message: 'Forbidden: user mismatch' });
    }

    if (userId === null || taskId === null) {
      return res.status(400).json({ success: false, message: 'Invalid userId or taskId' });
    }

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE user_id = $1 AND id = $2
       RETURNING id`,
      [userId, taskId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete task',
    });
  }
};
