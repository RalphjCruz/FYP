type MockDb = {
  query: jest.Mock;
};

const buildSchemaAwareDb = (rowFactory: (sql: string) => { rows: unknown[] }) => {
  const query = jest.fn(async (sql: string) => {
    if (
      sql.includes('CREATE TABLE IF NOT EXISTS user_deletion_requests')
      || sql.includes('ALTER TABLE user_deletion_requests')
      || sql.includes('CREATE INDEX IF NOT EXISTS idx_user_deletion_requests')
    ) {
      return { rows: [] };
    }

    return rowFactory(sql);
  });

  return { query } as MockDb;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ADSVC-001 ensureUserDeletionRequestSchema', () => {
  it('runs schema setup once per module instance and skips duplicate calls', async () => {
    jest.resetModules();
    const accountDeletionService = await import('../../../src/services/accountDeletionService.js');
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }) };

    await accountDeletionService.ensureUserDeletionRequestSchema(db);
    await accountDeletionService.ensureUserDeletionRequestSchema(db);

    expect(db.query).toHaveBeenCalledTimes(6);
  });
});

describe('TC-ADSVC-002 getAccountDeletionStatus', () => {
  it('maps Date-like row values to ISO strings', async () => {
    jest.resetModules();
    const accountDeletionService = await import('../../../src/services/accountDeletionService.js');
    const db = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 51,
              status: 'pending',
              requested_at: new Date('2026-04-12T10:00:00.000Z'),
              scheduled_purge_at: new Date('2026-04-19T10:00:00.000Z'),
              cancelled_at: new Date('2026-04-13T10:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await accountDeletionService.getAccountDeletionStatus(51, db);

    expect(result).toEqual({
      status: 'pending',
      requestedAt: '2026-04-12T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-19T10:00:00.000Z',
      cancelledAt: '2026-04-13T10:00:00.000Z',
    });
  });
});

describe('TC-ADSVC-003 requestAccountDeletion', () => {
  it('returns idempotent pending response with cancelledAt when existing pending row has a value', async () => {
    jest.resetModules();
    const accountDeletionService = await import('../../../src/services/accountDeletionService.js');
    const db = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 52,
              status: 'pending',
              requested_at: '2026-04-10T10:00:00.000Z',
              scheduled_purge_at: '2026-04-17T10:00:00.000Z',
              cancelled_at: new Date('2026-04-11T10:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await accountDeletionService.requestAccountDeletion(
      52,
      '203.0.113.52',
      db,
      new Date('2026-04-13T10:00:00.000Z'),
    );

    expect(result).toEqual({
      status: 'pending',
      requestedAt: '2026-04-10T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-17T10:00:00.000Z',
      cancelledAt: '2026-04-11T10:00:00.000Z',
      idempotent: true,
    });
  });
});

describe('TC-ADSVC-004 requestAccountDeletion', () => {
  it('covers insert and update response branches for cancelledAt mapping', async () => {
    jest.resetModules();
    const accountDeletionService = await import('../../../src/services/accountDeletionService.js');

    const insertDb = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 53,
              status: 'pending',
              requested_at: '2026-04-13T10:00:00.000Z',
              scheduled_purge_at: '2026-04-20T10:00:00.000Z',
              cancelled_at: new Date('2026-04-09T10:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const inserted = await accountDeletionService.requestAccountDeletion(
      53,
      '203.0.113.53',
      insertDb,
      new Date('2026-04-13T10:00:00.000Z'),
    );
    expect(inserted.cancelledAt).toBe('2026-04-09T10:00:00.000Z');

    const updateDb = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 54,
              status: 'cancelled',
              requested_at: '2026-04-08T10:00:00.000Z',
              scheduled_purge_at: '2026-04-15T10:00:00.000Z',
              cancelled_at: new Date('2026-04-09T10:00:00.000Z'),
            },
          ],
        };
      }
      if (sql.includes('UPDATE user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 54,
              status: 'pending',
              requested_at: '2026-04-13T10:00:00.000Z',
              scheduled_purge_at: '2026-04-20T10:00:00.000Z',
              cancelled_at: new Date('2026-04-10T10:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const updated = await accountDeletionService.requestAccountDeletion(
      54,
      '203.0.113.54',
      updateDb,
      new Date('2026-04-13T10:00:00.000Z'),
    );
    expect(updated.cancelledAt).toBe('2026-04-10T10:00:00.000Z');
  });
});

describe('TC-ADSVC-005 cancelAccountDeletion', () => {
  it('returns cancelled status for non-pending cancelled rows and maps null cancelledAt from update rows', async () => {
    jest.resetModules();
    const accountDeletionService = await import('../../../src/services/accountDeletionService.js');

    const cancelledDb = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 55,
              status: 'cancelled',
              requested_at: '2026-04-08T10:00:00.000Z',
              scheduled_purge_at: '2026-04-15T10:00:00.000Z',
              cancelled_at: new Date('2026-04-09T10:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const cancelledResult = await accountDeletionService.cancelAccountDeletion(55, cancelledDb);
    expect(cancelledResult.status).toBe('cancelled');
    expect(cancelledResult.idempotent).toBe(true);

    const updateDb = buildSchemaAwareDb((sql) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 56,
              status: 'pending',
              requested_at: '2026-04-08T10:00:00.000Z',
              scheduled_purge_at: '2026-04-15T10:00:00.000Z',
              cancelled_at: null,
            },
          ],
        };
      }
      if (sql.includes('UPDATE user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 56,
              status: 'cancelled',
              requested_at: '2026-04-08T10:00:00.000Z',
              scheduled_purge_at: '2026-04-15T10:00:00.000Z',
              cancelled_at: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const updatedResult = await accountDeletionService.cancelAccountDeletion(
      56,
      updateDb,
      new Date('2026-04-13T10:00:00.000Z'),
    );
    expect(updatedResult.cancelledAt).toBeNull();
  });
});
