import pool from '../config/database.js';
import { evaluateAndUnlockAchievementsWithClient, type UserAchievement } from './achievementService.js';
import { addXpToSlimeWithClient } from './xpService.js';
import { sanitizeText } from '../utils/inputSanitizer.js';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export type TaskRecord = {
  id: number;
  userId: number;
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  status: string;
  xpReward: number;
  createdAt: string;
  completedAt: string | null;
};

export type CompletedTaskMeta = {
  xpAwarded?: number;
  slimeLevel?: number;
  totalExperience?: number;
  achievementsUnlocked?: UserAchievement[];
};

type UpdateTaskInput = {
  title?: unknown;
  description?: unknown;
  difficulty?: unknown;
};

type CreateTaskInput = {
  title?: unknown;
  description?: unknown;
  difficulty?: unknown;
};

const DIFFICULTY_XP: Record<TaskDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

const normalizeDifficulty = (value: unknown): TaskDifficulty | null => {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return null;
};

const mapTask = (row: Record<string, unknown>): TaskRecord => ({
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

export class TaskServiceError extends Error {
  constructor(
    public readonly code:
      | 'TASK_TITLE_REQUIRED'
      | 'TASK_TITLE_EMPTY'
      | 'TASK_NOT_FOUND'
      | 'TASK_ALREADY_COMPLETED',
    message: string,
  ) {
    super(message);
    this.name = 'TaskServiceError';
  }
}

export const getTasksByUserId = async (userId: number): Promise<TaskRecord[]> => {
  const result = await pool.query(
    `SELECT *
     FROM tasks
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => mapTask(row));
};

export const createTaskForUser = async (userId: number, input: CreateTaskInput): Promise<TaskRecord> => {
  const title = sanitizeText(input.title, { trim: true, collapseWhitespace: true, maxLength: 120 });
  const description = sanitizeText(input.description, { trim: true, collapseWhitespace: false, maxLength: 1000 });
  const difficulty = normalizeDifficulty(input.difficulty) ?? 'medium';

  if (title.length === 0) {
    throw new TaskServiceError('TASK_TITLE_REQUIRED', 'Task title is required');
  }

  const xpReward = DIFFICULTY_XP[difficulty];

  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, status, experience_reward)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     RETURNING *`,
    [userId, title, description || null, difficulty, xpReward],
  );

  return mapTask(result.rows[0]);
};

export const updateTaskForUser = async (userId: number, taskId: number, input: UpdateTaskInput): Promise<TaskRecord> => {
  const hasTitle = typeof input.title !== 'undefined';
  const hasDescription = typeof input.description !== 'undefined';
  const difficulty = normalizeDifficulty(input.difficulty);

  const title = hasTitle ? sanitizeText(input.title, { trim: true, collapseWhitespace: true, maxLength: 120 }) : null;
  const description = hasDescription
    ? sanitizeText(input.description, { trim: true, collapseWhitespace: false, maxLength: 1000 })
    : null;

  if (hasTitle && (!title || title.length === 0)) {
    throw new TaskServiceError('TASK_TITLE_EMPTY', 'Task title cannot be empty');
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
    throw new TaskServiceError('TASK_NOT_FOUND', 'Task not found');
  }

  return mapTask(result.rows[0]);
};

export const completeTaskForUser = async (
  userId: number,
  taskId: number,
): Promise<{ task: TaskRecord; meta?: CompletedTaskMeta }> => {
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
      throw new TaskServiceError('TASK_NOT_FOUND', 'Task not found');
    }

    const existingTask = existingTaskResult.rows[0] as Record<string, unknown>;
    if (String(existingTask.status) === 'completed') {
      throw new TaskServiceError('TASK_ALREADY_COMPLETED', 'Task already completed');
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
    const xpSnapshot = xpReward > 0 ? await addXpToSlimeWithClient(client, userId, xpReward, 'task_complete') : null;
    const achievementResult = await evaluateAndUnlockAchievementsWithClient(client, userId);

    const meta: CompletedTaskMeta = {};
    if (xpSnapshot) {
      meta.xpAwarded = xpReward;
      meta.slimeLevel = xpSnapshot.level;
      meta.totalExperience = xpSnapshot.totalExperience;
    }

    if (achievementResult.newlyUnlocked.length > 0) {
      meta.achievementsUnlocked = achievementResult.newlyUnlocked;
    }

    await client.query('COMMIT');

    return {
      task: mapTask(taskRow),
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteTaskForUser = async (userId: number, taskId: number) => {
  const result = await pool.query(
    `DELETE FROM tasks
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, taskId],
  );

  if (result.rows.length === 0) {
    throw new TaskServiceError('TASK_NOT_FOUND', 'Task not found');
  }
};

export const resetTasksForUser = async (userId: number): Promise<{ deletedCount: number }> => {
  const result = await pool.query(
    `DELETE FROM tasks
     WHERE user_id = $1`,
    [userId],
  );

  return {
    deletedCount: result.rowCount ?? 0,
  };
};
