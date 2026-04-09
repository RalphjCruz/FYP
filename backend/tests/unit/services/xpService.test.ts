import pool from '../../../src/config/database.js';
import {
  addXpToSlime,
  addXpToSlimeWithClient,
  buildSlimeLevelSnapshot,
  experienceToAdvanceLevel,
  resetSlimeXp,
  resetSlimeXpWithClient,
  syncSlimeLevelFromStoredExperience,
  totalExperienceForLevel,
} from '../../../src/services/xpService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-XP-001 XP progression math', () => {
  it('calculates level advance XP and cumulative XP floors correctly', () => {
    expect(experienceToAdvanceLevel(0)).toBe(100);
    expect(experienceToAdvanceLevel(-3)).toBe(100);
    expect(experienceToAdvanceLevel(1)).toBe(100);
    expect(experienceToAdvanceLevel(2)).toBe(128);
    expect(experienceToAdvanceLevel(3)).toBe(164);

    expect(totalExperienceForLevel(1)).toBe(0);
    expect(totalExperienceForLevel(2)).toBe(100);
    expect(totalExperienceForLevel(3)).toBe(228);
  });
});

describe('TC-XP-002 buildSlimeLevelSnapshot', () => {
  it('normalizes negative XP and computes level/evolution/progress boundaries', () => {
    const fromNegative = buildSlimeLevelSnapshot(-25);
    expect(fromNegative.totalExperience).toBe(0);
    expect(fromNegative.level).toBe(1);
    expect(fromNegative.evolutionStage).toBe(1);
    expect(fromNegative.experienceIntoLevel).toBe(0);
    expect(fromNegative.experienceForNextLevel).toBe(100);
    expect(fromNegative.levelProgressPercent).toBe(0);

    const atLevelThreeFloor = buildSlimeLevelSnapshot(228);
    expect(atLevelThreeFloor.level).toBe(3);
    expect(atLevelThreeFloor.experienceIntoLevel).toBe(0);

    const highLevel = buildSlimeLevelSnapshot(totalExperienceForLevel(40));
    expect(highLevel.level).toBeGreaterThanOrEqual(40);
    expect(highLevel.evolutionStage).toBe(5);
  });
});

describe('TC-XP-003 addXpToSlimeWithClient guards', () => {
  it('rejects invalid XP amounts and missing slime records', async () => {
    const dbInvalid = { query: jest.fn() };
    await expect(addXpToSlimeWithClient(dbInvalid as any, 7, 0, 'task_complete')).rejects.toThrow(
      'XP amount must be a positive integer',
    );

    const dbMissing = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
          return { rows: [] };
        }

        return { rows: [] };
      }),
    };

    await expect(addXpToSlimeWithClient(dbMissing as any, 7, 10, 'task_complete')).rejects.toThrow(
      'Slime not found for user',
    );
  });
});

describe('TC-XP-004 addXpToSlimeWithClient', () => {
  it('updates slime XP/level, ensures xp events table, and records event', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 30 }] };
      }

      return { rows: [] };
    });

    const db = { query: queryMock };
    const result = await addXpToSlimeWithClient(db as any, 7, 20, 'task_complete');

    expect(result).toEqual(
      expect.objectContaining({
        xpAdded: 20,
        reason: 'task_complete',
        totalExperience: 50,
        level: 1,
        evolutionStage: 1,
      }),
    );

    const updateCall = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE slimes'));
    expect(updateCall).toBeDefined();
    const createEventsTableCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('CREATE TABLE IF NOT EXISTS slime_xp_events'),
    );
    expect(createEventsTableCall).toBeDefined();
    const insertEventCall = queryMock.mock.calls.find((call) => String(call[0]).includes('INSERT INTO slime_xp_events'));
    expect(insertEventCall).toBeDefined();
  });
});

describe('TC-XP-005 sync/reset with client', () => {
  it('syncs slime XP from stored value and resets XP + events using provided db client', async () => {
    const queryMock = jest.fn(async (_sql: string) => ({ rows: [] }));
    const db = { query: queryMock };

    const syncResult = await syncSlimeLevelFromStoredExperience(db as any, 7, 228);
    expect(syncResult).toEqual(
      expect.objectContaining({
        totalExperience: 228,
        level: 3,
      }),
    );

    const resetResult = await resetSlimeXpWithClient(db as any, 7);
    expect(resetResult).toEqual(
      expect.objectContaining({
        totalExperience: 0,
        level: 1,
      }),
    );

    const deleteEventsCall = queryMock.mock.calls.find((call) => String(call[0]).includes('DELETE FROM slime_xp_events'));
    expect(deleteEventsCall).toBeDefined();
  });
});

describe('TC-XP-006 transactional wrappers', () => {
  it('commits on success and rolls back on failure for addXpToSlime and resetSlimeXp', async () => {
    const addSuccessQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: 0 }] };
      }
      return { rows: [] };
    });
    const addSuccessRelease = jest.fn();
    const addSuccessClient = { query: addSuccessQuery, release: addSuccessRelease };

    const addFailQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const addFailRelease = jest.fn();
    const addFailClient = { query: addFailQuery, release: addFailRelease };

    const resetSuccessQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const resetSuccessRelease = jest.fn();
    const resetSuccessClient = { query: resetSuccessQuery, release: resetSuccessRelease };

    const resetFailQuery = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('UPDATE slimes')) {
        throw new Error('update failed');
      }
      return { rows: [] };
    });
    const resetFailRelease = jest.fn();
    const resetFailClient = { query: resetFailQuery, release: resetFailRelease };

    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock
      .mockResolvedValueOnce(addSuccessClient)
      .mockResolvedValueOnce(addFailClient)
      .mockResolvedValueOnce(resetSuccessClient)
      .mockResolvedValueOnce(resetFailClient);

    const addSuccessResult = await addXpToSlime(7, 10, 'task_complete');
    expect(addSuccessResult).toEqual(expect.objectContaining({ xpAdded: 10, totalExperience: 10 }));
    expect(addSuccessQuery).toHaveBeenCalledWith('COMMIT');
    expect(addSuccessRelease).toHaveBeenCalledTimes(1);

    await expect(addXpToSlime(7, 10, 'task_complete')).rejects.toThrow('Slime not found for user');
    expect(addFailQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(addFailRelease).toHaveBeenCalledTimes(1);

    const resetSuccessResult = await resetSlimeXp(7);
    expect(resetSuccessResult).toEqual(expect.objectContaining({ totalExperience: 0, level: 1 }));
    expect(resetSuccessQuery).toHaveBeenCalledWith('COMMIT');
    expect(resetSuccessRelease).toHaveBeenCalledTimes(1);

    await expect(resetSlimeXp(7)).rejects.toThrow('update failed');
    expect(resetFailQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(resetFailRelease).toHaveBeenCalledTimes(1);
  });
});

describe('TC-XP-007 addXpToSlimeWithClient', () => {
  it('falls back to zero when stored slime experience is nullish before adding XP', async () => {
    const queryMock = jest.fn(async (sql: string) => {
      if (sql.includes('FROM slimes') && sql.includes('FOR UPDATE')) {
        return { rows: [{ experience: undefined }] };
      }

      return { rows: [] };
    });

    const db = { query: queryMock };
    const result = await addXpToSlimeWithClient(db as any, 7, 15, 'task_complete');

    expect(result).toEqual(
      expect.objectContaining({
        totalExperience: 15,
        xpAdded: 15,
        reason: 'task_complete',
      }),
    );
  });
});
