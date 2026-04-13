import {
  purgeDueAccountDeletionRequests,
  purgeSingleAccountDeletionRequest,
} from '../../../src/services/accountRetentionService.js';

type MockDb = {
  query: jest.Mock;
  connect: jest.Mock;
};

const buildDb = (options?: {
  rootQuery?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  clientQuery?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}) => {
  const releaseMock = jest.fn();
  const clientQuery = jest.fn(options?.clientQuery ?? (async () => ({ rows: [] })));
  const rootQuery = jest.fn(options?.rootQuery ?? (async () => ({ rows: [] })));

  const db = {
    query: rootQuery,
    connect: jest.fn().mockResolvedValue({
      query: clientQuery,
      release: releaseMock,
    }),
  } as unknown as MockDb;

  return { db, rootQuery, clientQuery, releaseMock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-B4-PRG-001 purgeDueAccountDeletionRequests', () => {
  it('returns no-op summary when no due deletion requests exist', async () => {
    const { db, rootQuery } = buildDb({
      rootQuery: async (sql) => {
        if (sql.includes('SELECT id, user_id, scheduled_purge_at')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    });

    const result = await purgeDueAccountDeletionRequests({ now: new Date('2026-04-13T12:00:00.000Z') }, db);

    expect(result).toEqual({
      scannedCount: 0,
      purgedCount: 0,
      failedCount: 0,
      failures: [],
    });
    expect(rootQuery.mock.calls.some((call) => call[0].includes('SELECT id, user_id, scheduled_purge_at'))).toBe(true);
    expect(db.connect).not.toHaveBeenCalled();
  });
});

describe('TC-B4-PRG-002 purgeSingleAccountDeletionRequest', () => {
  it('cleans non-cascade artifacts and deletes the user when request is due', async () => {
    const now = new Date('2026-04-13T12:00:00.000Z');
    const { db, clientQuery } = buildDb({
      clientQuery: async (sql, params) => {
        if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
          return {
            rows: [
              {
                id: 201,
                user_id: 51,
                status: 'pending',
                scheduled_purge_at: '2026-04-12T12:00:00.000Z',
                email: 'student@example.com',
              },
            ],
          };
        }
        if (sql.includes('SELECT to_regclass')) {
          return { rows: [{ regclass: params?.[0] }] };
        }
        if (sql.includes('DELETE FROM users')) {
          return { rows: [{ id: 51 }] };
        }
        return { rows: [] };
      },
    });

    const result = await purgeSingleAccountDeletionRequest(201, now, db);

    expect(result).toBe(true);
    expect(clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM auth_login_guards'))).toBe(true);
    expect(clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM auth_audit_logs'))).toBe(true);
    expect(clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM users'))).toBe(true);
  });
});

describe('TC-B4-PRG-003 purgeSingleAccountDeletionRequest', () => {
  it('writes operational/system purge-executed log outside user-owned data', async () => {
    const now = new Date('2026-04-13T12:00:00.000Z');
    const { db, clientQuery } = buildDb({
      clientQuery: async (sql, params) => {
        if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
          return {
            rows: [
              {
                id: 202,
                user_id: 52,
                status: 'pending',
                scheduled_purge_at: '2026-04-12T12:00:00.000Z',
                email: 'delete-me@example.com',
              },
            ],
          };
        }
        if (sql.includes('SELECT to_regclass')) {
          return { rows: [{ regclass: params?.[0] }] };
        }
        if (sql.includes('DELETE FROM users')) {
          return { rows: [{ id: 52 }] };
        }
        return { rows: [] };
      },
    });

    const result = await purgeSingleAccountDeletionRequest(202, now, db);

    expect(result).toBe(true);
    const insertCall = clientQuery.mock.calls.find((call) => call[0].includes('INSERT INTO operational_audit_logs'));
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]?.[0]).toBe('account_purge_executed');
    expect(insertCall?.[1]?.[1]).toBe(52);
  });
});

describe('TC-B4-PRG-004 purgeDueAccountDeletionRequests', () => {
  it('continues on per-request failure, records retry metadata, and still purges later items', async () => {
    const now = new Date('2026-04-13T12:00:00.000Z');
    const rootQuery = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, user_id, scheduled_purge_at')) {
        return {
          rows: [
            { id: 301, user_id: 61, scheduled_purge_at: '2026-04-10T00:00:00.000Z' },
            { id: 302, user_id: 62, scheduled_purge_at: '2026-04-10T00:00:00.000Z' },
          ],
        };
      }
      if (sql.includes('UPDATE user_deletion_requests')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO operational_audit_logs')) {
        throw new Error('simulated failed-audit-log insert');
      }
      return { rows: [] };
    });

    let connectCount = 0;
    const connect = jest.fn().mockImplementation(async () => {
      connectCount += 1;
      const clientQuery = jest.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
          if (connectCount === 1) {
            return {
              rows: [
                {
                  id: 301,
                  user_id: 61,
                  status: 'pending',
                  scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                  email: 'fail@example.com',
                },
              ],
            };
          }

          return {
            rows: [
              {
                id: 302,
                user_id: 62,
                status: 'pending',
                scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                email: 'ok@example.com',
              },
            ],
          };
        }

        if (sql.includes('SELECT to_regclass')) {
          return { rows: [{ regclass: params?.[0] }] };
        }

        if (sql.includes('DELETE FROM users')) {
          if (connectCount === 1) {
            throw new Error('simulated purge delete failure');
          }
          return { rows: [{ id: 62 }] };
        }

        if (sql === 'ROLLBACK' || sql === 'COMMIT' || sql === 'BEGIN') {
          return { rows: [] };
        }

        return { rows: [] };
      });

      return {
        query: clientQuery,
        release: jest.fn(),
      };
    });

    const db = { query: rootQuery, connect } as unknown as MockDb;
    const result = await purgeDueAccountDeletionRequests({ now, batchSize: 10 }, db);

    expect(result.scannedCount).toBe(2);
    expect(result.purgedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.failures[0]).toEqual(
      expect.objectContaining({
        requestId: 301,
        userId: 61,
      }),
    );
    expect(rootQuery.mock.calls.some((call) => call[0].includes('UPDATE user_deletion_requests'))).toBe(true);
    expect(rootQuery.mock.calls.some((call) => call[0].includes('INSERT INTO operational_audit_logs'))).toBe(true);
  });
});

describe('TC-B4-PRG-005 purgeSingleAccountDeletionRequest', () => {
  it('returns false safely for idempotent reruns and missing user-delete rows', async () => {
    const missingRequest = buildDb({
      clientQuery: async (sql) => {
        if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    });
    const noDeleteRow = buildDb({
      clientQuery: async (sql, params) => {
        if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
          return {
            rows: [
              {
                id: 998,
                user_id: 81,
                status: 'pending',
                scheduled_purge_at: '2026-04-10T00:00:00.000Z',
                email: 'ghost@example.com',
              },
            ],
          };
        }
        if (sql.includes('SELECT to_regclass')) {
          return { rows: [{ regclass: params?.[0] }] };
        }
        if (sql.includes('DELETE FROM users')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    });

    const missingResult = await purgeSingleAccountDeletionRequest(999, new Date('2026-04-13T12:00:00.000Z'), missingRequest.db);
    const noDeleteResult = await purgeSingleAccountDeletionRequest(998, new Date('2026-04-13T12:00:00.000Z'), noDeleteRow.db);

    expect(missingResult).toBe(false);
    expect(noDeleteResult).toBe(false);
    expect(missingRequest.clientQuery.mock.calls.some((call) => call[0].includes('DELETE FROM users'))).toBe(false);
  });
});

describe('TC-B4-PRG-006 purgeSingleAccountDeletionRequest', () => {
  it('returns false for non-pending requests and for pending requests that are not yet due', async () => {
    let connectCount = 0;
    const connect = jest.fn().mockImplementation(async () => {
      connectCount += 1;
      return {
        query: jest.fn(async (sql: string) => {
          if (sql.includes('SELECT dr.id, dr.user_id, dr.status')) {
            if (connectCount === 1) {
              return {
                rows: [
                  {
                    id: 401,
                    user_id: 71,
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
                  id: 402,
                  user_id: 72,
                  status: 'pending',
                  scheduled_purge_at: '2026-05-01T00:00:00.000Z',
                  email: 'later@example.com',
                },
              ],
            };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
    });

    const db = {
      query: jest.fn(async () => ({ rows: [] })),
      connect,
    } as unknown as MockDb;

    const cancelledResult = await purgeSingleAccountDeletionRequest(401, new Date('2026-04-13T12:00:00.000Z'), db);
    const futureResult = await purgeSingleAccountDeletionRequest(402, new Date('2026-04-13T12:00:00.000Z'), db);

    expect(cancelledResult).toBe(false);
    expect(futureResult).toBe(false);
  });
});
