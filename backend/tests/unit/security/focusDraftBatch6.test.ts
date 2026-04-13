import pool from '../../../src/config/database.js';
import { recordFocusSessionCompletion, startFocusSessionDraft } from '../../../src/services/studyHealthService.js';

const baseStudyStatsRow = {
  day_streak: 1,
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
};

const buildClient = (queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>) => {
  const query = jest.fn(queryImpl);
  const release = jest.fn();
  return { query, release };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-B6-FDR-001 startFocusSessionDraft', () => {
  it('marks prior active draft as invalidated before inserting new active draft', async () => {
    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT experience') && sql.includes('FOR UPDATE')) return { rows: [{ experience: 240 }] };
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) return { rows: [baseStudyStatsRow] };
      if (sql.includes('SELECT local_day::text AS local_day')) return { rows: [] };
      if (sql.includes('INSERT INTO focus_session_drafts')) {
        return {
          rows: [
            {
              id: 501,
              user_id: 7,
              status: 'active',
              started_at_utc: '2026-04-08T12:00:00.000Z',
              timezone_iana: 'UTC',
              local_day_key: '2026-04-08',
            },
          ],
        };
      }
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    const draft = await startFocusSessionDraft(7, {
      timezoneIana: 'UTC',
      startedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(draft).toEqual(
      expect.objectContaining({
        draftId: 501,
        status: 'active',
      }),
    );
    expect(client.query.mock.calls.some((call) => call[0].includes("SET status = 'invalidated'"))).toBe(true);
  });
});

describe('TC-B6-FDR-002 startFocusSessionDraft', () => {
  it('preserves one-active-draft lifecycle by invalidating then inserting on each new start', async () => {
    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT experience') && sql.includes('FOR UPDATE')) return { rows: [{ experience: 240 }] };
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) return { rows: [baseStudyStatsRow] };
      if (sql.includes('SELECT local_day::text AS local_day')) return { rows: [] };
      if (sql.includes('INSERT INTO focus_session_drafts')) {
        return {
          rows: [
            {
              id: 502,
              user_id: 7,
              status: 'active',
              started_at_utc: '2026-04-08T12:10:00.000Z',
              timezone_iana: 'UTC',
              local_day_key: '2026-04-08',
            },
          ],
        };
      }
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    await startFocusSessionDraft(7, { timezoneIana: 'UTC', startedAtUtc: new Date('2026-04-08T12:10:00.000Z') });
    const invalidateIndex = client.query.mock.calls.findIndex((call) => call[0].includes("SET status = 'invalidated'"));
    const insertIndex = client.query.mock.calls.findIndex((call) => call[0].includes('INSERT INTO focus_session_drafts'));

    expect(invalidateIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(invalidateIndex);
  });
});

describe('TC-B6-FDR-003 recordFocusSessionCompletion', () => {
  it('rejects completion when referenced active draft does not exist', async () => {
    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM focus_session_drafts') && sql.includes('FOR UPDATE')) return { rows: [] };
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    await expect(
      recordFocusSessionCompletion(7, {
        draftId: 999,
        completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Active focus draft not found');
  });
});

describe('TC-B6-FDR-004 recordFocusSessionCompletion', () => {
  it('rejects completion when elapsed draft duration is below minimum threshold', async () => {
    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM focus_session_drafts') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 601,
              user_id: 7,
              status: 'active',
              started_at_utc: '2026-04-08T11:58:00.000Z',
              timezone_iana: 'UTC',
              local_day_key: '2026-04-08',
            },
          ],
        };
      }
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    await expect(
      recordFocusSessionCompletion(7, {
        draftId: 601,
        completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Focus session must be at least 5 minutes');
  });
});

describe('TC-B6-FDR-005 recordFocusSessionCompletion', () => {
  it('transitions active draft to completed and records focus session on success', async () => {
    const schemaMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    schemaMock.mockResolvedValue({ rows: [], rowCount: 0 });

    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('FROM focus_session_drafts') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 701,
              user_id: 7,
              status: 'active',
              started_at_utc: '2026-04-08T11:00:00.000Z',
              timezone_iana: 'UTC',
              local_day_key: '2026-04-08',
            },
          ],
        };
      }
      if (sql.includes('SELECT experience') && sql.includes('FOR UPDATE')) return { rows: [{ experience: 240 }] };
      if (sql.includes('FROM user_study_stats') && sql.includes('FOR UPDATE')) return { rows: [baseStudyStatsRow] };
      if (sql.includes('SELECT local_day::text AS local_day')) return { rows: [] };
      if (sql.includes("UPDATE focus_session_drafts") && sql.includes("status = 'completed'")) return { rows: [{ id: 701 }] };
      if (sql.includes('SELECT focused_minutes') && sql.includes('FROM user_study_daily')) return { rows: [{ focused_minutes: 65 }] };
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    const snapshot = await recordFocusSessionCompletion(7, {
      draftId: 701,
      completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      timezoneIana: 'UTC',
    });

    expect(snapshot.todayFocusedMinutes).toBe(65);
    expect(client.query.mock.calls.some((call) => call[0].includes("status = 'completed'"))).toBe(true);
    expect(client.query.mock.calls.some((call) => call[0].includes('INSERT INTO focus_sessions'))).toBe(true);
  });
});

describe('TC-B6-FDR-006 recordFocusSessionCompletion', () => {
  it('rejects replay completion when draft is already completed/invalidated', async () => {
    const client = buildClient(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM focus_session_drafts') && sql.includes('FOR UPDATE')) {
        return {
          rows: [
            {
              id: 801,
              user_id: 7,
              status: 'completed',
              started_at_utc: '2026-04-08T11:00:00.000Z',
              timezone_iana: 'UTC',
              local_day_key: '2026-04-08',
            },
          ],
        };
      }
      return { rows: [] };
    });
    (jest.spyOn(pool, 'connect') as unknown as jest.Mock).mockResolvedValue(client);

    await expect(
      recordFocusSessionCompletion(7, {
        draftId: 801,
        completedAtUtc: new Date('2026-04-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Focus draft is no longer active');
  });
});
