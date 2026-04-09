import pool from '../../../src/config/database.js';
import * as achievementService from '../../../src/services/achievementService.js';
import * as xpService from '../../../src/services/xpService.js';
import {
  TaskServiceError,
  completeTaskForUser,
  createTaskForUser,
  deleteTaskForUser,
  getTasksByUserId,
  resetTasksForUser,
  updateTaskForUser,
} from '../../../src/services/taskService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-TSVC-001 getTasksByUserId', () => {
  it('maps database rows into task records and defaults invalid difficulty to medium', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 5,
          user_id: 11,
          title: 'Read chapter',
          description: null,
          priority: 'unknown',
          status: 'pending',
          experience_reward: 20,
          created_at: '2026-03-01T10:00:00.000Z',
          completed_at: null,
        },
      ],
    });

    const result = await getTasksByUserId(11);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM tasks'), [11]);
    expect(result).toEqual([
      {
        id: 5,
        userId: 11,
        title: 'Read chapter',
        description: '',
        difficulty: 'medium',
        status: 'pending',
        xpReward: 20,
        createdAt: '2026-03-01T10:00:00.000Z',
        completedAt: null,
      },
    ]);
  });
});

describe('TC-TSVC-002 createTaskForUser', () => {
  it('throws TASK_TITLE_REQUIRED when title sanitizes to empty', async () => {
    await expect(
      createTaskForUser(11, {
        title: '   ',
        description: 'desc',
        difficulty: 'easy',
      }),
    ).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_TITLE_REQUIRED',
      message: 'Task title is required',
    } as Partial<TaskServiceError>);
  });
});

describe('TC-TSVC-003 createTaskForUser', () => {
  it('inserts task with normalized values and maps returned task record', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 7,
          user_id: 11,
          title: 'Deep work',
          description: 'No distractions',
          priority: 'hard',
          status: 'pending',
          experience_reward: 35,
          created_at: '2026-03-02T10:00:00.000Z',
          completed_at: null,
        },
      ],
    });

    const result = await createTaskForUser(11, {
      title: '  Deep work  ',
      description: 'No distractions',
      difficulty: 'hard',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tasks'), [
      11,
      'Deep work',
      'No distractions',
      'hard',
      35,
    ]);
    expect(result).toEqual({
      id: 7,
      userId: 11,
      title: 'Deep work',
      description: 'No distractions',
      difficulty: 'hard',
      status: 'pending',
      xpReward: 35,
      createdAt: '2026-03-02T10:00:00.000Z',
      completedAt: null,
    });
  });
});

describe('TC-TSVC-004 updateTaskForUser', () => {
  it('throws TASK_TITLE_EMPTY when title is provided but sanitizes to empty', async () => {
    await expect(
      updateTaskForUser(11, 3, {
        title: '   ',
      }),
    ).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_TITLE_EMPTY',
      message: 'Task title cannot be empty',
    } as Partial<TaskServiceError>);
  });
});

describe('TC-TSVC-005 updateTaskForUser', () => {
  it('throws TASK_NOT_FOUND when update query returns no rows', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [],
    });

    await expect(
      updateTaskForUser(11, 999, {
        title: 'Updated title',
        difficulty: 'medium',
      }),
    ).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    } as Partial<TaskServiceError>);
  });
});

describe('TC-TSVC-006 deleteTaskForUser', () => {
  it('throws TASK_NOT_FOUND when delete query returns no rows', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [],
    });

    await expect(deleteTaskForUser(11, 404)).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    } as Partial<TaskServiceError>);
  });
});

describe('TC-TSVC-007 updateTaskForUser', () => {
  it('updates task and maps returned row with sanitized values', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 9,
          user_id: 11,
          title: 'Updated task',
          description: '  keep spacing  ',
          priority: 'easy',
          status: 'pending',
          experience_reward: 10,
          created_at: '2026-03-03T09:00:00.000Z',
          completed_at: null,
        },
      ],
    });

    const result = await updateTaskForUser(11, 9, {
      title: '  Updated task  ',
      description: '  keep spacing  ',
      difficulty: 'easy',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE tasks'), [
      11,
      9,
      'Updated task',
      'keep spacing',
      'easy',
      10,
    ]);
    expect(result).toEqual({
      id: 9,
      userId: 11,
      title: 'Updated task',
      description: '  keep spacing  ',
      difficulty: 'easy',
      status: 'pending',
      xpReward: 10,
      createdAt: '2026-03-03T09:00:00.000Z',
      completedAt: null,
    });
  });
});

describe('TC-TSVC-008 completeTaskForUser', () => {
  it('throws TASK_NOT_FOUND and rolls back when task does not exist', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = { query: queryMock, release: releaseMock };
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    await expect(completeTaskForUser(11, 404)).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    } as Partial<TaskServiceError>);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-TSVC-009 completeTaskForUser', () => {
  it('throws TASK_ALREADY_COMPLETED and rolls back when task is already completed', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 3,
              user_id: 11,
              title: 'Done task',
              description: null,
              priority: 'medium',
              status: 'completed',
              experience_reward: 20,
              created_at: '2026-03-01T10:00:00.000Z',
              completed_at: '2026-03-01T12:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = { query: queryMock, release: releaseMock };
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    await expect(completeTaskForUser(11, 3)).rejects.toMatchObject({
      name: 'TaskServiceError',
      code: 'TASK_ALREADY_COMPLETED',
      message: 'Task already completed',
    } as Partial<TaskServiceError>);

    expect(queryMock).toHaveBeenCalledWith('BEGIN');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-TSVC-010 completeTaskForUser', () => {
  it('commits completed task and returns meta with XP + newly unlocked achievements', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 8,
              user_id: 11,
              title: 'Focus task',
              description: '',
              priority: 'hard',
              status: 'pending',
              experience_reward: 35,
              created_at: '2026-03-01T09:00:00.000Z',
              completed_at: null,
            },
          ],
        };
      }

      if (sql.includes("SET status = 'completed'")) {
        return {
          rows: [
            {
              id: 8,
              user_id: 11,
              title: 'Focus task',
              description: '',
              priority: 'hard',
              status: 'completed',
              experience_reward: 35,
              created_at: '2026-03-01T09:00:00.000Z',
              completed_at: '2026-03-01T11:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = { query: queryMock, release: releaseMock };
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const addXpMock = jest.spyOn(xpService, 'addXpToSlimeWithClient') as unknown as jest.Mock;
    addXpMock.mockResolvedValue({
      level: 4,
      totalExperience: 220,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievementsWithClient') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({
      newlyUnlocked: [
        {
          key: 'first_task',
          name: 'First Task',
          description: 'Complete your first task.',
          badgeIcon: '',
          unlockedAt: '2026-03-01T11:00:00.000Z',
        },
      ],
    });

    const result = await completeTaskForUser(11, 8);

    expect(addXpMock).toHaveBeenCalledWith(client, 11, 35, 'task_complete');
    expect(evaluateMock).toHaveBeenCalledWith(client, 11);
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(result.meta).toEqual({
      xpAwarded: 35,
      slimeLevel: 4,
      totalExperience: 220,
      achievementsUnlocked: [
        {
          key: 'first_task',
          name: 'First Task',
          description: 'Complete your first task.',
          badgeIcon: '',
          unlockedAt: '2026-03-01T11:00:00.000Z',
        },
      ],
    });
  });
});

describe('TC-TSVC-011 completeTaskForUser', () => {
  it('returns undefined meta when xp reward is zero and no achievements unlock', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 10,
              user_id: 11,
              title: 'No XP task',
              description: '',
              priority: 'easy',
              status: 'pending',
              experience_reward: 0,
              created_at: '2026-03-01T09:00:00.000Z',
              completed_at: null,
            },
          ],
        };
      }

      if (sql.includes("SET status = 'completed'")) {
        return {
          rows: [
            {
              id: 10,
              user_id: 11,
              title: 'No XP task',
              description: '',
              priority: 'easy',
              status: 'completed',
              experience_reward: 0,
              created_at: '2026-03-01T09:00:00.000Z',
              completed_at: '2026-03-01T11:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = { query: queryMock, release: releaseMock };
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const addXpMock = jest.spyOn(xpService, 'addXpToSlimeWithClient') as unknown as jest.Mock;
    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievementsWithClient') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const result = await completeTaskForUser(11, 10);

    expect(addXpMock).not.toHaveBeenCalled();
    expect(evaluateMock).toHaveBeenCalledWith(client, 11);
    expect(result.meta).toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-TSVC-012 resetTasksForUser', () => {
  it('returns deletedCount from rowCount and falls back to zero when rowCount is nullish', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: undefined });

    const first = await resetTasksForUser(11);
    const second = await resetTasksForUser(11);

    expect(first).toEqual({ deletedCount: 3 });
    expect(second).toEqual({ deletedCount: 0 });
  });
});

describe('TC-TSVC-013 createTaskForUser', () => {
  it('defaults invalid difficulty to medium and sends null description when sanitized description is empty', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 12,
          user_id: 11,
          title: 'Fallback difficulty task',
          description: null,
          priority: 'medium',
          status: 'pending',
          experience_reward: 20,
          created_at: '2026-03-04T10:00:00.000Z',
          completed_at: null,
        },
      ],
    });

    const result = await createTaskForUser(11, {
      title: 'Fallback difficulty task',
      description: '   ',
      difficulty: 'invalid-value',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tasks'), [
      11,
      'Fallback difficulty task',
      null,
      'medium',
      20,
    ]);
    expect(result).toEqual({
      id: 12,
      userId: 11,
      title: 'Fallback difficulty task',
      description: '',
      difficulty: 'medium',
      status: 'pending',
      xpReward: 20,
      createdAt: '2026-03-04T10:00:00.000Z',
      completedAt: null,
    });
  });
});

describe('TC-TSVC-014 updateTaskForUser', () => {
  it('keeps nullable update fields when title/description/difficulty are not provided', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          id: 13,
          user_id: 11,
          title: 'Existing task',
          description: 'Existing description',
          priority: 'hard',
          status: 'pending',
          experience_reward: 35,
          created_at: '2026-03-04T10:30:00.000Z',
          completed_at: null,
        },
      ],
    });

    const result = await updateTaskForUser(11, 13, {
      difficulty: 'not-valid',
    });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE tasks'), [11, 13, null, null, null, null]);
    expect(result).toEqual({
      id: 13,
      userId: 11,
      title: 'Existing task',
      description: 'Existing description',
      difficulty: 'hard',
      status: 'pending',
      xpReward: 35,
      createdAt: '2026-03-04T10:30:00.000Z',
      completedAt: null,
    });
  });
});

describe('TC-TSVC-015 completeTaskForUser', () => {
  it('treats null experience_reward as zero and skips XP awarding', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 14,
              user_id: 11,
              title: 'Null xp task',
              description: '',
              priority: 'medium',
              status: 'pending',
              experience_reward: null,
              created_at: '2026-03-04T11:00:00.000Z',
              completed_at: null,
            },
          ],
        };
      }

      if (sql.includes("SET status = 'completed'")) {
        return {
          rows: [
            {
              id: 14,
              user_id: 11,
              title: 'Null xp task',
              description: '',
              priority: 'medium',
              status: 'completed',
              experience_reward: null,
              created_at: '2026-03-04T11:00:00.000Z',
              completed_at: '2026-03-04T12:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const client = { query: queryMock, release: releaseMock };
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue(client);

    const addXpMock = jest.spyOn(xpService, 'addXpToSlimeWithClient') as unknown as jest.Mock;
    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievementsWithClient') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const result = await completeTaskForUser(11, 14);

    expect(addXpMock).not.toHaveBeenCalled();
    expect(evaluateMock).toHaveBeenCalledWith(client, 11);
    expect(result.meta).toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-TSVC-016 deleteTaskForUser', () => {
  it('completes without error when delete query returns a row', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [{ id: 15 }],
    });

    await expect(deleteTaskForUser(11, 15)).resolves.toBeUndefined();

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM tasks'), [11, 15]);
  });
});
