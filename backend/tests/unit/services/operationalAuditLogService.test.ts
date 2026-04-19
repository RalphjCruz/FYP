afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-OAUD-001 ensureOperationalAuditSchema', () => {
  it('initializes schema once per module instance and skips duplicate setup calls', async () => {
    jest.resetModules();
    const operationalAuditService = await import('../../../src/services/operationalAuditLogService.js');

    const db = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await operationalAuditService.ensureOperationalAuditSchema(db);
    await operationalAuditService.ensureOperationalAuditSchema(db);

    expect(db.query).toHaveBeenCalledTimes(3);
    expect(db.query.mock.calls[0]?.[0]).toContain('CREATE TABLE IF NOT EXISTS operational_audit_logs');
  });
});

describe('TC-OAUD-002 logOperationalAuditEvent', () => {
  it('writes null actor/metadata when optional values are omitted', async () => {
    jest.resetModules();
    const operationalAuditService = await import('../../../src/services/operationalAuditLogService.js');

    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    await operationalAuditService.logOperationalAuditEvent(
      {
        eventType: 'account_export_requested',
      },
      db,
    );

    const insertCall = db.query.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO operational_audit_logs'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual(['account_export_requested', null, 'null']);
  });
});

describe('TC-OAUD-003 default db wiring', () => {
  it('uses default pool db when db argument is omitted', async () => {
    jest.resetModules();
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    jest.doMock('../../../src/config/database.js', () => ({
      __esModule: true,
      default: { query },
    }));

    const operationalAuditService = await import('../../../src/services/operationalAuditLogService.js');

    await operationalAuditService.ensureOperationalAuditSchema();
    await operationalAuditService.logOperationalAuditEvent({
      eventType: 'account_deletion_cancelled',
      actorUserId: 77,
      metadata: { source: 'unit-test' },
    });

    const insertCall = query.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO operational_audit_logs'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]?.[0]).toBe('account_deletion_cancelled');
    expect(insertCall?.[1]?.[1]).toBe(77);
  });
});
