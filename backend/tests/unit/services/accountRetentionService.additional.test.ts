import {
  purgeDueAccountDeletionRequests,
  purgeSingleAccountDeletionRequest,
} from '../../../src/services/accountRetentionService.js';

type MockDb = {
  query: jest.Mock;
  connect: jest.Mock;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ARTN-001 purgeSingleAccountDeletionRequest', () => {
  it('skips optional auth cleanup tables when they do not exist and still purges user', async () => {
    const clientQuery = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
        return {
          rows: [
            {
              id: 501,
              user_id: 91,
              status: 'pending',
              scheduled_purge_at: '2026-04-10T00:00:00.000Z',
              email: 'skip-cleanup@example.com',
            },
          ],
        };
      }
      if (sql.includes('SELECT to_regclass')) {
        return { rows: [{ regclass: null }] };
      }
      if (sql.includes('DELETE FROM users')) {
        return { rows: [{ id: 91 }] };
      }
      return { rows: [] };
    });

    const db = {
      query: jest.fn(async () => ({ rows: [] })),
      connect: jest.fn().mockResolvedValue({
        query: clientQuery,
        release: jest.fn(),
      }),
    } as unknown as MockDb;

    const result = await purgeSingleAccountDeletionRequest(501, undefined as unknown as Date, db);

    expect(result).toBe(true);
    expect(clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM auth_login_guards'))).toBe(false);
    expect(clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM auth_audit_logs'))).toBe(false);
  });
});

describe('TC-ARTN-002 purgeDueAccountDeletionRequests', () => {
  it('handles purged=false rows and converts non-Error failures into retry-safe failure reasons', async () => {
    let connectCount = 0;
    const db = {
      query: jest.fn(async (sql: string) => {
        if (
          sql.includes('CREATE TABLE IF NOT EXISTS user_deletion_requests')
          || sql.includes('ALTER TABLE user_deletion_requests')
          || sql.includes('CREATE INDEX IF NOT EXISTS idx_user_deletion_requests')
        ) {
          return { rows: [] };
        }

        if (sql.includes('SELECT id, user_id, scheduled_purge_at')) {
          return {
            rows: [
              { id: 601, user_id: 101, scheduled_purge_at: '2026-04-10T00:00:00.000Z' },
              { id: 602, user_id: 102, scheduled_purge_at: '2026-04-10T00:00:00.000Z' },
            ],
          };
        }

        if (sql.includes('UPDATE user_deletion_requests')) {
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO operational_audit_logs')) {
          return { rows: [] };
        }

        return { rows: [] };
      }),
      connect: jest.fn().mockImplementation(async () => {
        connectCount += 1;
        return {
          query: jest.fn(async (sql: string) => {
            if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
              if (connectCount === 1) {
                return {
                  rows: [
                    {
                      id: 601,
                      user_id: 101,
                      status: 'cancelled',
                      scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                      email: 'cancelled@example.com',
                    },
                  ],
                };
              }

              return {
                rows: [
                  {
                    id: 602,
                    user_id: 102,
                    status: 'pending',
                    scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                    email: 'failing@example.com',
                  },
                ],
              };
            }

            if (sql.includes('SELECT to_regclass')) {
              return { rows: [{ regclass: 'public.auth_login_guards' }] };
            }

            if (sql.includes('DELETE FROM users')) {
              throw 'string failure from delete';
            }

            return { rows: [] };
          }),
          release: jest.fn(),
        };
      }),
    } as unknown as MockDb;

    const result = await purgeDueAccountDeletionRequests({}, db);

    expect(result.scannedCount).toBe(2);
    expect(result.purgedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.failures[0]?.reason).toBe('string failure from delete');
    expect(db.query.mock.calls.some((call) => call[0].includes('UPDATE user_deletion_requests'))).toBe(true);
  });
});

describe('TC-ARTN-003 purgeDueAccountDeletionRequests', () => {
  it('uses fallback unknown purge error message when thrown value is null and input defaults are omitted', async () => {
    let connectCount = 0;
    const db = {
      query: jest.fn(async (sql: string) => {
        if (
          sql.includes('CREATE TABLE IF NOT EXISTS user_deletion_requests')
          || sql.includes('ALTER TABLE user_deletion_requests')
          || sql.includes('CREATE INDEX IF NOT EXISTS idx_user_deletion_requests')
        ) {
          return { rows: [] };
        }

        if (sql.includes('SELECT id, user_id, scheduled_purge_at')) {
          return {
            rows: [{ id: 701, user_id: 111, scheduled_purge_at: '2026-04-10T00:00:00.000Z' }],
          };
        }

        if (sql.includes('UPDATE user_deletion_requests')) {
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO operational_audit_logs')) {
          return { rows: [] };
        }

        return { rows: [] };
      }),
      connect: jest.fn().mockImplementation(async () => {
        connectCount += 1;
        return {
          query: jest.fn(async (sql: string) => {
            if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
              return {
                rows: [
                  {
                    id: 701,
                    user_id: 111,
                    status: 'pending',
                    scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                    email: 'null-error@example.com',
                  },
                ],
              };
            }

            if (sql.includes('SELECT to_regclass')) {
              return { rows: [{ regclass: connectCount === 1 ? null : 'public.auth_login_guards' }] };
            }

            if (sql.includes('DELETE FROM users')) {
              throw null;
            }

            return { rows: [] };
          }),
          release: jest.fn(),
        };
      }),
    } as unknown as MockDb;

    const result = await purgeDueAccountDeletionRequests(undefined, db);

    expect(result.failedCount).toBe(1);
    expect(result.failures[0]?.reason).toBe('Unknown purge error');
  });
});

describe('TC-ARTN-004 default db wiring', () => {
  it('uses default pool db when db argument is omitted for single and batch purge paths', async () => {
    jest.resetModules();
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('CREATE TABLE IF NOT EXISTS user_deletion_requests')
        || sql.includes('ALTER TABLE user_deletion_requests')
        || sql.includes('CREATE INDEX IF NOT EXISTS idx_user_deletion_requests')
      ) {
        return { rows: [] };
      }

      if (sql.includes('SELECT id, user_id, scheduled_purge_at')) {
        return { rows: [] };
      }

      return { rows: [] };
    });
    const clientQuery = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
        return {
          rows: [
            {
              id: 801,
              user_id: 121,
              status: 'cancelled',
              scheduled_purge_at: '2026-04-10T00:00:00.000Z',
              email: 'cancelled@example.com',
            },
          ],
        };
      }

      return { rows: [] };
    });

    jest.doMock('../../../src/config/database.js', () => ({
      __esModule: true,
      default: {
        query,
        connect: jest.fn().mockResolvedValue({
          query: clientQuery,
          release: jest.fn(),
        }),
      },
    }));

    const accountRetentionService = await import('../../../src/services/accountRetentionService.js');

    const singleResult = await accountRetentionService.purgeSingleAccountDeletionRequest(
      801,
      new Date('2026-04-13T00:00:00.000Z'),
    );
    const batchResult = await accountRetentionService.purgeDueAccountDeletionRequests();

    expect(singleResult).toBe(false);
    expect(batchResult.scannedCount).toBe(0);
    expect(query).toHaveBeenCalled();
    expect(clientQuery).toHaveBeenCalled();
  });
});
