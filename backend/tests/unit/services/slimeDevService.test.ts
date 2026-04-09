import pool from '../../../src/config/database.js';
import {
  addSlimeXpDevForUser,
  createOrGetTestUserWithSlime,
  resetSlimeAchievementsDevForUser,
  resetSlimeXpDevForUser,
} from '../../../src/services/slimeDevService.js';
import * as achievementService from '../../../src/services/achievementService.js';
import * as xpService from '../../../src/services/xpService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-SDEV-001 addSlimeXpDevForUser', () => {
  it('adds dev XP and returns level snapshot merged with newly unlocked achievements', async () => {
    const addXpMock = jest.spyOn(xpService, 'addXpToSlime') as unknown as jest.Mock;
    addXpMock.mockResolvedValue({
      level: 3,
      totalExperience: 250,
      experienceIntoLevel: 22,
      experienceForNextLevel: 164,
      experienceToNextLevel: 142,
      levelProgressPercent: 13.41,
      evolutionStage: 1,
      xpAdded: 50,
      reason: 'dev_manual_add',
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({
      newlyUnlocked: [
        {
          key: 'task_10',
          name: 'Task Apprentice',
          description: 'Complete 10 tasks.',
          badgeIcon: '',
          unlockedAt: '2026-04-08T10:00:00.000Z',
        },
      ],
    });

    const result = await addSlimeXpDevForUser(7, 50);

    expect(addXpMock).toHaveBeenCalledWith(7, 50, 'dev_manual_add');
    expect(evaluateMock).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      level: 3,
      totalExperience: 250,
      experienceIntoLevel: 22,
      experienceForNextLevel: 164,
      experienceToNextLevel: 142,
      levelProgressPercent: 13.41,
      evolutionStage: 1,
      xpAdded: 50,
      reason: 'dev_manual_add',
      achievementsUnlocked: [
        {
          key: 'task_10',
          name: 'Task Apprentice',
          description: 'Complete 10 tasks.',
          badgeIcon: '',
          unlockedAt: '2026-04-08T10:00:00.000Z',
        },
      ],
    });
  });
});

describe('TC-SDEV-002 resetSlimeXpDevForUser', () => {
  it('delegates to xp reset service for the specified user', async () => {
    const resetXpMock = jest.spyOn(xpService, 'resetSlimeXp') as unknown as jest.Mock;
    resetXpMock.mockResolvedValue({
      totalExperience: 0,
      level: 1,
      evolutionStage: 1,
      experienceIntoLevel: 0,
      experienceForNextLevel: 100,
      experienceToNextLevel: 100,
      levelProgressPercent: 0,
    });

    const result = await resetSlimeXpDevForUser(7);

    expect(resetXpMock).toHaveBeenCalledWith(7);
    expect(result).toEqual(
      expect.objectContaining({
        totalExperience: 0,
        level: 1,
      }),
    );
  });
});

describe('TC-SDEV-003 resetSlimeAchievementsDevForUser', () => {
  it('delegates to achievement reset service for the specified user', async () => {
    const resetAchievementsMock = jest.spyOn(achievementService, 'resetUserAchievements') as unknown as jest.Mock;
    resetAchievementsMock.mockResolvedValue({ deletedCount: 3 });

    const result = await resetSlimeAchievementsDevForUser(7);

    expect(resetAchievementsMock).toHaveBeenCalledWith(7);
    expect(result).toEqual({ deletedCount: 3 });
  });
});

describe('TC-SDEV-004 createOrGetTestUserWithSlime', () => {
  it('returns existing test user and existing slime without creating new records', async () => {
    const existingUser = { id: 12, email: 'test@myslime.com', username: 'TestUser' };
    const existingSlime = {
      id: 90,
      user_id: 12,
      name: 'Slimey',
      level: 1,
      experience: 0,
      color: 'green',
      evolution_stage: 1,
      created_at: '2026-04-01T08:00:00.000Z',
      updated_at: '2026-04-01T08:00:00.000Z',
    };

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [existingUser] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [existingSlime] };
      }
      return { rows: [] };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const result = await createOrGetTestUserWithSlime();

    expect(result).toEqual({
      user: existingUser,
      slime: existingSlime,
      userCreated: false,
      slimeCreated: false,
    });
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SDEV-005 createOrGetTestUserWithSlime', () => {
  it('creates test user and slime when both records are missing', async () => {
    const createdUser = { id: 14, email: 'test@myslime.com', username: 'TestUser' };
    const createdSlime = {
      id: 91,
      user_id: 14,
      name: 'Slimey',
      level: 1,
      experience: 0,
      color: 'green',
      evolution_stage: 1,
      created_at: '2026-04-01T09:00:00.000Z',
      updated_at: '2026-04-01T09:00:00.000Z',
    };

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO users')) {
        return { rows: [createdUser] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO slimes')) {
        return { rows: [createdSlime] };
      }
      return { rows: [] };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const result = await createOrGetTestUserWithSlime();

    expect(result).toEqual({
      user: createdUser,
      slime: createdSlime,
      userCreated: true,
      slimeCreated: true,
    });
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SDEV-006 createOrGetTestUserWithSlime', () => {
  it('rolls back transaction and rethrows when query fails', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM users')) {
        throw new Error('users query failed');
      }
      return { rows: [] };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(createOrGetTestUserWithSlime()).rejects.toThrow('users query failed');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
