import pool from '../../../src/config/database.js';
import {
  evaluateAndUnlockAchievements,
  evaluateAndUnlockAchievementsWithClient,
  getAchievementProgress,
  getAchievementProgressWithClient,
  getUserAchievements,
  getUserAchievementsWithClient,
  resetUserAchievements,
  resetUserAchievementsWithClient,
} from '../../../src/services/achievementService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ACH-001 getUserAchievementsWithClient', () => {
  it('returns only valid achievement keys and filters out invalid rows', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest.fn(async () => ({
      rows: [
        {
          achievement_key: 'first_task',
          name: 'First Task',
          description: 'Complete your first task.',
          badge_icon: '',
          unlocked_at: '2026-04-01T10:00:00.000Z',
        },
        {
          achievement_key: 'invalid_key',
          name: 'Invalid',
          description: 'Invalid row',
          badge_icon: '',
          unlocked_at: '2026-04-01T10:00:00.000Z',
        },
      ],
    }));

    const result = await getUserAchievementsWithClient({ query: dbQueryMock } as any, 7);

    expect(result).toEqual([
      {
        key: 'first_task',
        name: 'First Task',
        description: 'Complete your first task.',
        badgeIcon: '',
        unlockedAt: '2026-04-01T10:00:00.000Z',
      },
    ]);
  });
});

describe('TC-ACH-002 getAchievementProgressWithClient', () => {
  it('maps unlocked achievements into progress list with unlockedAt and lock state', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest.fn(async () => ({
      rows: [
        {
          achievement_key: 'task_10',
          name: 'Task Apprentice',
          description: 'Complete 10 tasks.',
          badge_icon: '',
          unlocked_at: '2026-04-02T11:00:00.000Z',
        },
      ],
    }));

    const result = await getAchievementProgressWithClient({ query: dbQueryMock } as any, 7);

    const unlockedTask10 = result.find((item) => item.key === 'task_10');
    const lockedLevel5 = result.find((item) => item.key === 'level_5');

    expect(unlockedTask10).toEqual(
      expect.objectContaining({
        key: 'task_10',
        isUnlocked: true,
        unlockedAt: '2026-04-02T11:00:00.000Z',
      }),
    );
    expect(lockedLevel5).toEqual(
      expect.objectContaining({
        key: 'level_5',
        isUnlocked: false,
        unlockedAt: null,
      }),
    );
  });
});

describe('TC-ACH-003 evaluateAndUnlockAchievementsWithClient', () => {
  it('evaluates stats, excludes already unlocked keys, and inserts newly unlocked achievements', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM tasks') && sql.includes("status = 'completed'")) {
        return { rows: [{ completed_count: 12 }] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 3, experience: 550 }] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ unlocked_count: 1 }] };
      }

      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [{ achievement_key: 'first_task' }] };
      }

      if (sql.includes('WITH inserted AS')) {
        const keys = (params?.[1] as string[]) ?? [];
        expect(keys).toEqual(expect.arrayContaining(['task_10', 'level_3', 'xp_500', 'first_unlock']));
        expect(keys).not.toContain('first_task');

        return {
          rows: [
            {
              achievement_key: 'task_10',
              name: 'Task Apprentice',
              description: 'Complete 10 tasks.',
              badge_icon: '',
              unlocked_at: '2026-04-03T12:00:00.000Z',
            },
            {
              achievement_key: 'invalid_key',
              name: 'Invalid',
              description: 'Should be filtered',
              badge_icon: '',
              unlocked_at: '2026-04-03T12:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await evaluateAndUnlockAchievementsWithClient({ query: dbQueryMock } as any, 7);

    expect(result).toEqual({
      newlyUnlocked: [
        {
          key: 'task_10',
          name: 'Task Apprentice',
          description: 'Complete 10 tasks.',
          badgeIcon: '',
          unlockedAt: '2026-04-03T12:00:00.000Z',
        },
      ],
    });
  });
});

describe('TC-ACH-004 evaluateAndUnlockAchievementsWithClient', () => {
  it('returns empty unlock list when no achievement conditions are met', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tasks') && sql.includes("status = 'completed'")) {
        return { rows: [{ completed_count: 0 }] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 1, experience: 0 }] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ unlocked_count: 0 }] };
      }

      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [] };
      }

      if (sql.includes('WITH inserted AS')) {
        throw new Error('Insert should not be called when no keys unlock');
      }

      return { rows: [] };
    });

    const result = await evaluateAndUnlockAchievementsWithClient({ query: dbQueryMock } as any, 7);

    expect(result).toEqual({ newlyUnlocked: [] });
  });
});

describe('TC-ACH-005 resetUserAchievementsWithClient', () => {
  it('returns deletedCount with nullish fallback to zero', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest
      .fn(async () => ({ rowCount: 2 }))
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValueOnce({} as any);

    const first = await resetUserAchievementsWithClient({ query: dbQueryMock } as any, 7);
    const second = await resetUserAchievementsWithClient({ query: dbQueryMock } as any, 7);

    expect(first).toEqual({ deletedCount: 2 });
    expect(second).toEqual({ deletedCount: 0 });
  });
});

describe('TC-ACH-006 resetUserAchievements', () => {
  it('commits on success and rolls back on failure in transactional wrapper', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const successQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('DELETE FROM user_achievements')) {
        return { rowCount: 3 };
      }

      return { rows: [] };
    });
    const successReleaseMock = jest.fn();

    const failQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('DELETE FROM user_achievements')) {
        throw new Error('delete failed');
      }

      return { rows: [] };
    });
    const failReleaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock
      .mockResolvedValueOnce({ query: successQueryMock, release: successReleaseMock })
      .mockResolvedValueOnce({ query: failQueryMock, release: failReleaseMock });

    const successResult = await resetUserAchievements(7);
    expect(successResult).toEqual({ deletedCount: 3 });
    expect(successQueryMock).toHaveBeenCalledWith('COMMIT');
    expect(successReleaseMock).toHaveBeenCalledTimes(1);

    await expect(resetUserAchievements(7)).rejects.toThrow('delete failed');
    expect(failQueryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(failReleaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-ACH-007 getUserAchievements', () => {
  it('returns mapped achievements through the pool-backed wrapper', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_achievements ua') && sql.includes('ORDER BY ua.unlocked_at DESC')) {
        return {
          rows: [
            {
              achievement_key: 'first_task',
              name: 'First Task',
              description: 'Complete your first task.',
              badge_icon: '',
              unlocked_at: '2026-04-04T09:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [], rowCount: 0 };
    });

    const result = await getUserAchievements(7);

    expect(result).toEqual([
      {
        key: 'first_task',
        name: 'First Task',
        description: 'Complete your first task.',
        badgeIcon: '',
        unlockedAt: '2026-04-04T09:00:00.000Z',
      },
    ]);
  });
});

describe('TC-ACH-008 getAchievementProgress', () => {
  it('returns progress list through the pool-backed wrapper', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_achievements ua') && sql.includes('ORDER BY ua.unlocked_at DESC')) {
        return {
          rows: [
            {
              achievement_key: 'level_3',
              name: 'Level 3 Reached',
              description: 'Reach slime level 3.',
              badge_icon: '',
              unlocked_at: '2026-04-04T10:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [], rowCount: 0 };
    });

    const result = await getAchievementProgress(7);
    const unlockedLevel3 = result.find((item) => item.key === 'level_3');
    const lockedLevel5 = result.find((item) => item.key === 'level_5');

    expect(unlockedLevel3).toEqual(
      expect.objectContaining({
        key: 'level_3',
        isUnlocked: true,
        unlockedAt: '2026-04-04T10:00:00.000Z',
      }),
    );
    expect(lockedLevel5).toEqual(
      expect.objectContaining({
        key: 'level_5',
        isUnlocked: false,
        unlockedAt: null,
      }),
    );
  });
});

describe('TC-ACH-009 evaluateAndUnlockAchievements', () => {
  it('commits on success and rolls back on failure in transactional wrapper', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const successQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes("status = 'completed'")) {
        return { rows: [{ completed_count: 10 }] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 3, experience: 550 }] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ unlocked_count: 1 }] };
      }

      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [] };
      }

      if (sql.includes('WITH inserted AS')) {
        return {
          rows: [
            {
              achievement_key: 'task_10',
              name: 'Task Apprentice',
              description: 'Complete 10 tasks.',
              badge_icon: '',
              unlocked_at: '2026-04-04T11:00:00.000Z',
            },
          ],
        };
      }

      return { rows: [] };
    });
    const successReleaseMock = jest.fn();

    const failQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM tasks') && sql.includes("status = 'completed'")) {
        throw new Error('stats query failed');
      }

      return { rows: [] };
    });
    const failReleaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock
      .mockResolvedValueOnce({ query: successQueryMock, release: successReleaseMock })
      .mockResolvedValueOnce({ query: failQueryMock, release: failReleaseMock });

    const successResult = await evaluateAndUnlockAchievements(7);
    expect(successResult.newlyUnlocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'task_10',
        }),
      ]),
    );
    expect(successQueryMock).toHaveBeenCalledWith('COMMIT');
    expect(successReleaseMock).toHaveBeenCalledTimes(1);

    await expect(evaluateAndUnlockAchievements(7)).rejects.toThrow('stats query failed');
    expect(failQueryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(failReleaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-ACH-010 ensureAchievementsSchema retry', () => {
  it('retries schema initialization after an initial failure', async () => {
    jest.resetModules();

    const freshPoolModule = await import('../../../src/config/database.js');
    const freshPool = freshPoolModule.default;
    const freshService = await import('../../../src/services/achievementService.js');

    const dbQueryMock = jest.fn(async () => ({ rows: [] }));
    let createTableAttempts = 0;

    const poolQueryMock = jest.spyOn(freshPool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS achievements')) {
        createTableAttempts += 1;
        if (createTableAttempts === 1) {
          throw new Error('schema init failed');
        }
      }

      return { rows: [], rowCount: 0 };
    });

    await expect(freshService.getUserAchievementsWithClient({ query: dbQueryMock } as any, 7)).rejects.toThrow(
      'schema init failed',
    );

    await expect(freshService.getUserAchievementsWithClient({ query: dbQueryMock } as any, 7)).resolves.toEqual([]);
    expect(createTableAttempts).toBe(2);
  });
});

describe('TC-ACH-011 evaluateAndUnlockAchievementsWithClient', () => {
  it('defaults missing stats rows to safe baseline values and returns no unlocks', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const dbQueryMock = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tasks') && sql.includes("status = 'completed'")) {
        return { rows: [] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [] };
      }

      if (sql.includes('WITH inserted AS')) {
        throw new Error('Insert should not run when no stats unlock anything');
      }

      return { rows: [] };
    });

    const result = await evaluateAndUnlockAchievementsWithClient({ query: dbQueryMock } as any, 7);
    expect(result).toEqual({ newlyUnlocked: [] });
  });
});
