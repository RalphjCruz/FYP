import pool from '../../../src/config/database.js';
import {
  applyDailyHpSettlement,
  calculateDailyHpDelta,
  ensureStudyHealthSchema,
  getMaxHpByLevel,
  getStudyHealthSnapshot,
  normalizeTimezoneIana,
  recordFocusSessionCompletion,
  resetStudyProgressDev,
  updateStudyProfile,
} from '../../../src/services/studyHealthService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-SHS-001 normalizeTimezoneIana', () => {
  it('returns UTC for invalid input and preserves valid timezone identifiers', () => {
    expect(normalizeTimezoneIana(undefined)).toBe('UTC');
    expect(normalizeTimezoneIana('')).toBe('UTC');
    expect(normalizeTimezoneIana('Invalid/Zone')).toBe('UTC');
    expect(normalizeTimezoneIana('Europe/Dublin')).toBe('Europe/Dublin');
  });
});

describe('TC-SHS-002 getMaxHpByLevel', () => {
  it('scales HP by level with level 1 baseline', () => {
    expect(getMaxHpByLevel(1)).toBe(100);
    expect(getMaxHpByLevel(3)).toBe(124);
    expect(getMaxHpByLevel(10)).toBe(208);
  });
});

describe('TC-SHS-003 calculateDailyHpDelta', () => {
  it('applies loss/recovery logic for no-study, under-goal, and over-goal days', () => {
    expect(calculateDailyHpDelta(3, 0, 180)).toBe(-12);

    const underGoal = calculateDailyHpDelta(3, 90, 180);
    expect(underGoal).toBeCloseTo(-6);

    const overGoal = calculateDailyHpDelta(3, 240, 180);
    expect(overGoal).toBeGreaterThan(0);
  });
});

describe('TC-SHS-004 applyDailyHpSettlement', () => {
  it('reduces level when HP depletes and no penalty was applied that day', () => {
    const penalized = applyDailyHpSettlement({
      level: 3,
      currentHp: 2,
      focusedMinutes: 0,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(penalized).toEqual(
      expect.objectContaining({
        nextHp: 1,
        nextLevel: 2,
        levelReduced: true,
      }),
    );

    const noSecondPenalty = applyDailyHpSettlement({
      level: 3,
      currentHp: 2,
      focusedMinutes: 0,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: true,
    });
    expect(noSecondPenalty.levelReduced).toBe(false);
    expect(noSecondPenalty.nextLevel).toBe(3);
  });
});

describe('TC-SHS-005 getStudyHealthSnapshot', () => {
  it('commits transaction and returns study-health snapshot on success', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 2,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 110,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 200,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0.3,
            },
          ],
        };
      }

      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 45 }] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const nowUtc = new Date('2026-04-08T12:00:00.000Z');
    const snapshot = await getStudyHealthSnapshot(7, { nowUtc });

    expect(snapshot).toEqual(
      expect.objectContaining({
        currentHp: 110,
        maxHp: 124,
        dayStreak: 2,
        dailyGoalMinutes: 200,
        todayFocusedMinutes: 45,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-07',
        hpDeltaCarry: 0.3,
        level: 3,
        levelReduced: false,
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-006 getStudyHealthSnapshot', () => {
  it('rolls back and rethrows when slime row is missing during locked state initialization', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') })).rejects.toThrow(
      'Slime not found for user',
    );
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-007 updateStudyProfile', () => {
  it('commits profile updates with normalized preferences and daily goal upsert', async () => {
    const queryMock = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 2,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 110,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO user_study_daily') && sql.includes('goal_minutes = EXCLUDED.goal_minutes')) {
        expect(params?.[2]).toBe(720);
        return { rows: [] };
      }

      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 30 }] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await updateStudyProfile(7, {
      targetDailyMinutes: 1000,
      studyStyle: 'invalid_style',
      preferredSessionIntensity: 9,
      distractionLevel: 'very-high',
      timezoneIana: 'Invalid/Zone',
      nowUtc: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        dailyGoalMinutes: 720,
        timezoneIana: 'UTC',
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-008 updateStudyProfile', () => {
  it('rolls back and rethrows when profile daily-upsert write fails', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO user_study_daily') && sql.includes('goal_minutes = EXCLUDED.goal_minutes')) {
        throw new Error('daily upsert failed');
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(updateStudyProfile(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') })).rejects.toThrow(
      'daily upsert failed',
    );
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-009 recordFocusSessionCompletion', () => {
  it('commits focus session, awards XP, updates streak, and returns snapshot', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const queryMock = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 2,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 110,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO focus_sessions')) {
        expect(params?.[1]).toBe(1);
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO user_study_daily') && sql.includes('focused_minutes = user_study_daily.focused_minutes + EXCLUDED.focused_minutes')) {
        expect(params?.[2]).toBe(1);
        return { rows: [] };
      }

      if (sql.includes('UPDATE slimes')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 61 }] };
      }

      if (sql.includes('SELECT COUNT(*)::int AS completed_count')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [] };
      }

      if (sql.includes('WITH inserted AS')) {
        return { rows: [] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await recordFocusSessionCompletion(7, {
      durationMinutes: 0,
      completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      timezoneIana: 'UTC',
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        todayFocusedMinutes: 61,
        dayStreak: 3,
        level: 3,
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-010 recordFocusSessionCompletion', () => {
  it('rolls back and rethrows when focus session insert fails', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO focus_sessions')) {
        throw new Error('focus insert failed');
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(
      recordFocusSessionCompletion(7, {
        durationMinutes: 25,
        completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('focus insert failed');
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-011 resetStudyProgressDev', () => {
  it('resets study state/session tables and commits with baseline snapshot', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 5,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: '2026-04-06',
              current_hp: 90,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 200,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0.4,
            },
          ],
        };
      }

      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await resetStudyProgressDev(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') });

    expect(snapshot).toEqual(
      expect.objectContaining({
        dayStreak: 0,
        currentHp: 124,
        lastSettledOnLocal: '2026-04-07',
        hpDeltaCarry: 0,
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-012 resetStudyProgressDev', () => {
  it('rolls back and rethrows when deleting focus sessions fails', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('DELETE FROM focus_sessions')) {
        throw new Error('delete focus sessions failed');
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(resetStudyProgressDev(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') })).rejects.toThrow(
      'delete focus sessions failed',
    );
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-013 getStudyHealthSnapshot', () => {
  it('continues successfully when legacy backfill update query fails in schema ensure step', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('SET last_studied_on_local = COALESCE')) {
        throw new Error('legacy backfill failed');
      }

      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 120 }] };
      }

      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 108,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }

      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 20 }] };
      }

      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') });
    expect(snapshot).toEqual(expect.objectContaining({ todayFocusedMinutes: 20 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-014 updateStudyProfile', () => {
  it('uses fallback nowUtc for invalid input and normalizes Date-based day fields from study stats row', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-08T12:00:00.000Z').getTime());

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 2,
              last_studied_on_local: new Date('2026-04-07T00:00:00.000Z'),
              last_level_penalty_on_local: new Date('2026-04-06T00:00:00.000Z'),
              current_hp: 110,
              last_hp_settled_on_local: new Date('2026-04-07T00:00:00.000Z'),
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 22 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await updateStudyProfile(7, { nowUtc: 'invalid-date' as any });
    expect(snapshot).toEqual(expect.objectContaining({ todayFocusedMinutes: 22 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });
});

describe('TC-SHS-015 getStudyHealthSnapshot', () => {
  it('rolls back when study stats row is still missing after initialization insert', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    await expect(getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-08T12:00:00.000Z') })).rejects.toThrow(
      'Failed to initialize user study stats',
    );
    expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-016 getStudyHealthSnapshot', () => {
  it('processes unprocessed-day aggregates and updates streak/HP across focused and non-focused days', async () => {
    const queryMock = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 120 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 60,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0.4,
            },
          ],
        };
      }
      if (sql.includes('SELECT local_day::text AS local_day') && sql.includes('FROM user_study_daily')) {
        expect(params?.[1]).toBe('2026-04-08');
        expect(params?.[2]).toBe('2026-04-09');
        return {
          rows: [
            { local_day: '2026-04-08', focused_minutes: 60, goal_minutes: 180 },
            { local_day: '2026-04-09', focused_minutes: 0, goal_minutes: 180 },
          ],
        };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 40 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-10T12:00:00.000Z') });
    expect(snapshot).toEqual(
      expect.objectContaining({
        dayStreak: 0,
        lastSettledOnLocal: '2026-04-09',
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-017 getStudyHealthSnapshot', () => {
  it('applies level-reduction settlement path when HP drops to zero on an unprocessed day', async () => {
    const queryMock = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 2,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 1,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('SELECT local_day::text AS local_day') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ local_day: '2026-04-08', focused_minutes: 0, goal_minutes: 180 }] };
      }
      if (sql.includes('UPDATE slimes')) {
        expect(params?.[1]).toBe(100);
        expect(params?.[2]).toBe(2);
        return { rows: [] };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 0 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-09T12:00:00.000Z') });
    expect(snapshot).toEqual(
      expect.objectContaining({
        level: 2,
        levelReduced: true,
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-018 recordFocusSessionCompletion', () => {
  it('sets streak to 1 when last studied day is neither yesterday nor current local day', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 240 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 5,
              last_studied_on_local: '2026-04-01',
              last_level_penalty_on_local: null,
              current_hp: 110,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO focus_sessions') || sql.includes('INSERT INTO user_study_daily')) {
        return { rows: [] };
      }
      if (sql.includes('UPDATE slimes')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT COUNT(*)::int AS completed_count')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_achievements ua') && sql.includes('JOIN achievements a')) {
        return { rows: [] };
      }
      if (sql.includes('WITH inserted AS')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 35 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await recordFocusSessionCompletion(7, {
      durationMinutes: 35,
      completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      timezoneIana: 'UTC',
    });
    expect(snapshot).toEqual(expect.objectContaining({ dayStreak: 1 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-019 applyDailyHpSettlement', () => {
  it('uses zero fallback for non-finite carry and applies floor path for positive delta-with-carry', () => {
    const result = applyDailyHpSettlement({
      level: 2,
      currentHp: 50,
      focusedMinutes: 180,
      goalMinutes: 180,
      hpDeltaCarry: Number.NaN,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        nextLevel: 2,
        levelReduced: false,
      }),
    );
    expect(result.appliedDelta).toBeGreaterThanOrEqual(0);
  });
});

describe('TC-SHS-020 ensureStudyHealthSchema', () => {
  it('uses default pool client and ignores legacy backfill update failure', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SET last_studied_on_local = COALESCE')) {
        throw new Error('legacy column missing');
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(ensureStudyHealthSchema()).resolves.toBeUndefined();
  });
});

describe('TC-SHS-021 getStudyHealthSnapshot', () => {
  it('uses nullish/default fallbacks for slime/stats/today rows when snapshot input is omitted', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-08T12:00:00.000Z').getTime());

    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: undefined }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: null,
              last_studied_on_local: null,
              last_level_penalty_on_local: null,
              current_hp: null,
              last_hp_settled_on_local: null,
              current_goal_minutes: null,
              study_style: null,
              preferred_session_intensity: null,
              distraction_level: null,
              timezone_iana: null,
              hp_delta_carry: 'not-a-number',
            },
          ],
        };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: null }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7);
    expect(snapshot).toEqual(
      expect.objectContaining({
        timezoneIana: 'UTC',
        todayFocusedMinutes: 0,
      }),
    );
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });
});

describe('TC-SHS-022 getStudyHealthSnapshot', () => {
  it('applies settlement branch that sets streak to one when focused day is non-consecutive', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 120 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 5,
              last_studied_on_local: '2026-04-01',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('SELECT local_day::text AS local_day') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ local_day: '2026-04-08', focused_minutes: 60, goal_minutes: 180 }] };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 60 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-09T12:00:00.000Z') });
    expect(snapshot).toEqual(expect.objectContaining({ dayStreak: 1 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-023 getStudyHealthSnapshot', () => {
  it('keeps streak unchanged in settlement when focused day equals already-recorded last studied day', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 120 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 4,
              last_studied_on_local: '2026-04-08',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('SELECT local_day::text AS local_day') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ local_day: '2026-04-08', focused_minutes: 45, goal_minutes: 180 }] };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [{ focused_minutes: 45 }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await getStudyHealthSnapshot(7, { nowUtc: new Date('2026-04-09T12:00:00.000Z') });
    expect(snapshot).toEqual(expect.objectContaining({ dayStreak: 4 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-SHS-024 resetStudyProgressDev', () => {
  it('uses default input object path and commits reset flow', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('SELECT experience') && sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 120 }] };
      }
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              day_streak: 1,
              last_studied_on_local: '2026-04-07',
              last_level_penalty_on_local: null,
              current_hp: 100,
              last_hp_settled_on_local: '2026-04-07',
              current_goal_minutes: 180,
              study_style: 'balanced',
              preferred_session_intensity: 3,
              distraction_level: 'medium',
              timezone_iana: 'UTC',
              hp_delta_carry: 0,
            },
          ],
        };
      }
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    const releaseMock = jest.fn();
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue({ query: queryMock, release: releaseMock });

    const snapshot = await resetStudyProgressDev(7);
    expect(snapshot).toEqual(expect.objectContaining({ dayStreak: 0 }));
    expect(queryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
