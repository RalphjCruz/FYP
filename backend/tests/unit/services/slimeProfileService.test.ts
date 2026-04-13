import pool from '../../../src/config/database.js';
import { SlimeProfileServiceError, buildSlimeStatsPayload } from '../../../src/services/slimeProfileService.js';
import * as achievementService from '../../../src/services/achievementService.js';
import * as studyHealthService from '../../../src/services/studyHealthService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-SPS-001 buildSlimeStatsPayload', () => {
  it('returns mapped payload with filtered unlocked achievements on happy path', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 3,
          user_id: 7,
          name: 'My Slime',
          level: 2,
          experience: 180,
          color: 'green',
          evolution_stage: 1,
          created_at: '2026-04-01T08:00:00.000Z',
          username: 'student',
          email: 'student@example.com',
        },
      ],
    });

    const getStudyHealthSnapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    getStudyHealthSnapshotMock.mockResolvedValue({
      currentHp: 80,
      maxHp: 100,
      dayStreak: 4,
      dailyGoalMinutes: 120,
      todayFocusedMinutes: 45,
      timezoneIana: 'Europe/Dublin',
      lastSettledOnLocal: '2026-04-01',
      hpDeltaCarry: 0,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const progressMock = jest.spyOn(achievementService, 'getAchievementProgress') as unknown as jest.Mock;
    progressMock.mockResolvedValue([
      {
        key: 'first_task',
        name: 'First Task',
        description: 'Complete your first task.',
        badgeIcon: '',
        isUnlocked: true,
        unlockedAt: '2026-04-02T09:00:00.000Z',
      },
      {
        key: 'level_3',
        name: 'Level 3 Reached',
        description: 'Reach slime level 3.',
        badgeIcon: '',
        isUnlocked: true,
        unlockedAt: null,
      },
      {
        key: 'task_10',
        name: 'Task Apprentice',
        description: 'Complete 10 tasks.',
        badgeIcon: '',
        isUnlocked: false,
        unlockedAt: null,
      },
    ]);

    const result = await buildSlimeStatsPayload({ userId: 7 });

    expect(result).toEqual({
      id: 3,
      name: 'My Slime',
      level: 2,
      experience: 80,
      totalExperience: 180,
      experienceForNextLevel: 128,
      experienceToNextLevel: 48,
      levelProgressPercent: 62.5,
      color: 'green',
      evolutionStage: 1,
      user: {
        id: 7,
        username: 'student',
        email: 'student@example.com',
      },
      achievements: [
        {
          key: 'first_task',
          name: 'First Task',
          description: 'Complete your first task.',
          badgeIcon: '',
          unlockedAt: '2026-04-02T09:00:00.000Z',
        },
      ],
      achievementProgress: [
        {
          key: 'first_task',
          name: 'First Task',
          description: 'Complete your first task.',
          badgeIcon: '',
          isUnlocked: true,
          unlockedAt: '2026-04-02T09:00:00.000Z',
        },
        {
          key: 'level_3',
          name: 'Level 3 Reached',
          description: 'Reach slime level 3.',
          badgeIcon: '',
          isUnlocked: true,
          unlockedAt: null,
        },
        {
          key: 'task_10',
          name: 'Task Apprentice',
          description: 'Complete 10 tasks.',
          badgeIcon: '',
          isUnlocked: false,
          unlockedAt: null,
        },
      ],
      studyHealth: {
        currentHp: 80,
        maxHp: 100,
        dayStreak: 4,
        dailyGoalMinutes: 120,
        todayFocusedMinutes: 45,
        timezoneIana: 'Europe/Dublin',
        lastSettledOnLocal: '2026-04-01',
        hpDeltaCarry: 0,
      },
      createdAt: '2026-04-01T08:00:00.000Z',
    });
  });
});

describe('TC-SPS-002 buildSlimeStatsPayload', () => {
  it('forwards simulatedNowUtc to study health snapshot resolver', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 3,
          user_id: 7,
          name: 'My Slime',
          level: 2,
          experience: 20,
          color: 'green',
          evolution_stage: 1,
          created_at: '2026-04-01T08:00:00.000Z',
          username: 'student',
          email: 'student@example.com',
        },
      ],
    });

    const getStudyHealthSnapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    getStudyHealthSnapshotMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 0,
      dailyGoalMinutes: 60,
      todayFocusedMinutes: 0,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-01',
      hpDeltaCarry: 0,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const progressMock = jest.spyOn(achievementService, 'getAchievementProgress') as unknown as jest.Mock;
    progressMock.mockResolvedValue([]);

    const simulatedNowUtc = new Date('2026-04-08T10:00:00.000Z');
    await buildSlimeStatsPayload({ userId: 7, simulatedNowUtc });

    expect(getStudyHealthSnapshotMock).toHaveBeenCalledWith(7, { nowUtc: simulatedNowUtc });
  });
});

describe('TC-SPS-003 buildSlimeStatsPayload', () => {
  it('throws SLIME_NOT_FOUND when the user has no slime record', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    await expect(buildSlimeStatsPayload({ userId: 7 })).rejects.toEqual(
      expect.objectContaining({
        name: 'SlimeProfileServiceError',
        code: 'SLIME_NOT_FOUND',
      }),
    );
  });
});

describe('TC-SPS-004 buildSlimeStatsPayload', () => {
  it('defaults nullish slime experience to zero before level snapshot mapping', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 3,
          user_id: 7,
          name: 'My Slime',
          level: 1,
          experience: null,
          color: 'green',
          evolution_stage: 1,
          created_at: '2026-04-01T08:00:00.000Z',
          username: 'student',
          email: 'student@example.com',
        },
      ],
    });

    const getStudyHealthSnapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    getStudyHealthSnapshotMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 0,
      dailyGoalMinutes: 60,
      todayFocusedMinutes: 0,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-01',
      hpDeltaCarry: 0,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const progressMock = jest.spyOn(achievementService, 'getAchievementProgress') as unknown as jest.Mock;
    progressMock.mockResolvedValue([]);

    const result = await buildSlimeStatsPayload({ userId: 7 });

    expect(result.totalExperience).toBe(0);
    expect(result.level).toBe(1);
    expect(result.experience).toBe(0);
    expect(result.experienceForNextLevel).toBe(100);
    expect(result.experienceToNextLevel).toBe(100);
    expect(result.levelProgressPercent).toBe(0);
  });
});

describe('TC-SPS-005 buildSlimeStatsPayload', () => {
  it('queries slime record once and does not refetch after study health resolution', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 3,
          user_id: 7,
          name: 'My Slime',
          level: 1,
          experience: 0,
          color: 'green',
          evolution_stage: 1,
          created_at: '2026-04-01T08:00:00.000Z',
          username: 'student',
          email: 'student@example.com',
        },
      ],
    });

    const getStudyHealthSnapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    getStudyHealthSnapshotMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 0,
      dailyGoalMinutes: 60,
      todayFocusedMinutes: 0,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-01',
      hpDeltaCarry: 0,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const progressMock = jest.spyOn(achievementService, 'getAchievementProgress') as unknown as jest.Mock;
    progressMock.mockResolvedValue([]);

    await buildSlimeStatsPayload({ userId: 7 });

    expect(poolQueryMock).toHaveBeenCalledTimes(1);
    expect(getStudyHealthSnapshotMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SPS-006 buildSlimeStatsPayload', () => {
  it('evaluates achievements before requesting achievement progress', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 3,
          user_id: 7,
          name: 'My Slime',
          level: 2,
          experience: 180,
          color: 'green',
          evolution_stage: 1,
          created_at: '2026-04-01T08:00:00.000Z',
          username: 'student',
          email: 'student@example.com',
        },
      ],
    });

    const getStudyHealthSnapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    getStudyHealthSnapshotMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 0,
      dailyGoalMinutes: 60,
      todayFocusedMinutes: 0,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-01',
      hpDeltaCarry: 0,
    });

    const evaluateMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    evaluateMock.mockResolvedValue({ newlyUnlocked: [] });

    const progressMock = jest.spyOn(achievementService, 'getAchievementProgress') as unknown as jest.Mock;
    progressMock.mockResolvedValue([]);

    await buildSlimeStatsPayload({ userId: 7 });

    expect(evaluateMock).toHaveBeenCalledWith(7);
    expect(progressMock).toHaveBeenCalledWith(7);
    expect(evaluateMock.mock.invocationCallOrder[0]).toBeLessThan(progressMock.mock.invocationCallOrder[0]);
  });
});
