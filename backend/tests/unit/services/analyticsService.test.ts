import pool from '../../../src/config/database.js';
import { getAnalyticsSummary } from '../../../src/services/analyticsService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ASV-001 getAnalyticsSummary', () => {
  it('returns mapped analytics summary with computed completion rate and trend data', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{ total_tasks: 10, completed_tasks: 4 }] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 3, experience: 550 }] };
      }

      if (sql.includes('FROM user_achievements')) {
        return { rows: [{ unlocked_count: 7 }] };
      }

      if (sql.includes('COUNT(t.id)')) {
        return {
          rows: [
            { date: '2026-04-02', value: 1 },
            { date: '2026-04-03', value: 0 },
          ],
        };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')) {
        return { rows: [] };
      }

      if (sql.includes('SUM(xe.xp_amount)')) {
        return {
          rows: [
            { date: '2026-04-02', value: 20 },
            { date: '2026-04-03', value: 0 },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);

    expect(result).toEqual({
      tasks: {
        total: 10,
        completed: 4,
        completionRatePercent: 40,
        completedLast7Days: [
          { date: '2026-04-02', value: 1 },
          { date: '2026-04-03', value: 0 },
        ],
      },
      xp: {
        totalExperience: 550,
        level: 3,
        gainedLast7Days: [
          { date: '2026-04-02', value: 20 },
          { date: '2026-04-03', value: 0 },
        ],
      },
      achievements: {
        unlockedCount: 7,
      },
    });
  });
});

describe('TC-ASV-002 getAnalyticsSummary', () => {
  it('returns zero completion rate when total task count is zero', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{ total_tasks: 0, completed_tasks: 0 }] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 1, experience: 0 }] };
      }
      if (sql.includes('FROM user_achievements')) {
        return { rows: [{ unlocked_count: 0 }] };
      }
      if (sql.includes('COUNT(t.id)') || sql.includes('SUM(xe.xp_amount)') || sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);
    expect(result.tasks.completionRatePercent).toBe(0);
  });
});

describe('TC-ASV-003 getAnalyticsSummary', () => {
  it('defaults slime metrics when slime row is missing', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{ total_tasks: 1, completed_tasks: 1 }] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_achievements')) {
        return { rows: [{ unlocked_count: 2 }] };
      }
      if (sql.includes('COUNT(t.id)') || sql.includes('SUM(xe.xp_amount)') || sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);
    expect(result.xp).toEqual({
      totalExperience: 0,
      level: 1,
      gainedLast7Days: [],
    });
  });
});

describe('TC-ASV-004 getAnalyticsSummary', () => {
  it('defaults unlocked achievement count to zero when aggregate row is missing', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{ total_tasks: 2, completed_tasks: 1 }] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 2, experience: 120 }] };
      }
      if (sql.includes('FROM user_achievements')) {
        return { rows: [] };
      }
      if (sql.includes('COUNT(t.id)') || sql.includes('SUM(xe.xp_amount)') || sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);
    expect(result.achievements.unlockedCount).toBe(0);
  });
});

describe('TC-ASV-005 getAnalyticsSummary', () => {
  it('normalizes null trend values to numeric zeros', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{ total_tasks: 3, completed_tasks: 2 }] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 2, experience: 200 }] };
      }
      if (sql.includes('FROM user_achievements')) {
        return { rows: [{ unlocked_count: 1 }] };
      }
      if (sql.includes('COUNT(t.id)')) {
        return { rows: [{ date: '2026-04-07', value: null }] };
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')) {
        return { rows: [] };
      }
      if (sql.includes('SUM(xe.xp_amount)')) {
        return { rows: [{ date: '2026-04-07', value: null }] };
      }
      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);
    expect(result.tasks.completedLast7Days).toEqual([{ date: '2026-04-07', value: 0 }]);
    expect(result.xp.gainedLast7Days).toEqual([{ date: '2026-04-07', value: 0 }]);
  });
});

describe('TC-ASV-006 getAnalyticsSummary', () => {
  it('propagates query errors from analytics data retrieval', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        throw new Error('task aggregate failed');
      }
      return { rows: [] };
    });

    await expect(getAnalyticsSummary(7)).rejects.toThrow('task aggregate failed');
  });
});

describe('TC-ASV-007 getAnalyticsSummary', () => {
  it('defaults task aggregate numeric fields when aggregate row exists without expected columns', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)::int AS total_tasks')) {
        return { rows: [{}] };
      }
      if (sql.includes('FROM slimes')) {
        return { rows: [{ level: 4, experience: 900 }] };
      }
      if (sql.includes('FROM user_achievements')) {
        return { rows: [{ unlocked_count: 3 }] };
      }
      if (
        sql.includes('COUNT(t.id)') ||
        sql.includes('SUM(xe.xp_amount)') ||
        sql.includes('CREATE TABLE IF NOT EXISTS slime_xp_events')
      ) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getAnalyticsSummary(7);
    expect(result.tasks.total).toBe(0);
    expect(result.tasks.completed).toBe(0);
    expect(result.tasks.completionRatePercent).toBe(0);
  });
});
