import pool from '../../../src/config/database.js';
import * as studyHealthService from '../../../src/services/studyHealthService.js';
import { getGlobalLeaderboard } from '../../../src/services/leaderboardService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-LBSV-001 getGlobalLeaderboard', () => {
  it('returns ranked leaderboard entries with numeric mapping for valid limit', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          user_id: '12',
          username: 'alpha',
          level: '4',
          total_experience: '650',
          completed_tasks: '21',
          unlocked_achievements: '5',
          day_streak: '3',
        },
        {
          user_id: '8',
          username: 'beta',
          level: '3',
          total_experience: '500',
          completed_tasks: '15',
          unlocked_achievements: '4',
          day_streak: '0',
        },
      ],
    });

    const result = await getGlobalLeaderboard(10);

    expect(schemaMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('FROM users u'), [10]);
    expect(result).toEqual([
      {
        rank: 1,
        userId: 12,
        username: 'alpha',
        level: 4,
        totalExperience: 650,
        completedTasks: 21,
        unlockedAchievements: 5,
        dayStreak: 3,
      },
      {
        rank: 2,
        userId: 8,
        username: 'beta',
        level: 3,
        totalExperience: 500,
        completedTasks: 15,
        unlockedAchievements: 4,
        dayStreak: 0,
      },
    ]);
  });
});

describe('TC-LBSV-002 getGlobalLeaderboard', () => {
  it('falls back to default limit 20 when requested limit is zero or negative', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({ rows: [] });

    await getGlobalLeaderboard(0);
    await getGlobalLeaderboard(-5);

    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining('LIMIT $1'), [20]);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $1'), [20]);
  });
});

describe('TC-LBSV-003 getGlobalLeaderboard', () => {
  it('falls back to default limit 20 when requested limit is above max bound', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({ rows: [] });

    await getGlobalLeaderboard(101);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [20]);
  });
});

describe('TC-LBSV-004 getGlobalLeaderboard', () => {
  it('falls back to default limit 20 when requested limit is not an integer', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({ rows: [] });

    await getGlobalLeaderboard(2.5);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [20]);
  });
});

describe('TC-LBSV-005 getGlobalLeaderboard', () => {
  it('uses safe fallback values for nullable level/xp/task/achievement/streak columns', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({
      rows: [
        {
          user_id: 1,
          username: 'fallback-user',
          level: null,
          total_experience: null,
          completed_tasks: null,
          unlocked_achievements: null,
          day_streak: null,
        },
      ],
    });

    const result = await getGlobalLeaderboard();

    expect(result).toEqual([
      {
        rank: 1,
        userId: 1,
        username: 'fallback-user',
        level: 1,
        totalExperience: 0,
        completedTasks: 0,
        unlockedAchievements: 0,
        dayStreak: 0,
      },
    ]);
  });
});

describe('TC-LBSV-006 getGlobalLeaderboard', () => {
  it('propagates persistence failures when leaderboard query fails', async () => {
    const schemaMock = jest.spyOn(studyHealthService, 'ensureStudyHealthSchema') as unknown as jest.Mock;
    schemaMock.mockResolvedValue(undefined);

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockRejectedValue(new Error('leaderboard query failed'));

    await expect(getGlobalLeaderboard(20)).rejects.toThrow('leaderboard query failed');
    expect(schemaMock).toHaveBeenCalledTimes(1);
  });
});
