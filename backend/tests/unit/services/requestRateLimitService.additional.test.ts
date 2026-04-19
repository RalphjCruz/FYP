afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-RL-SVC-004 ensureRequestRateLimitSchema', () => {
  it('initializes schema once per module instance and skips duplicate setup calls', async () => {
    jest.resetModules();
    const rateLimitService = await import('../../../src/services/requestRateLimitService.js');

    const db = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await rateLimitService.ensureRequestRateLimitSchema(db);
    await rateLimitService.ensureRequestRateLimitSchema(db);

    expect(db.query).toHaveBeenCalledTimes(3);
    expect(db.query.mock.calls[0]?.[0]).toContain('CREATE TABLE IF NOT EXISTS request_rate_limits');
  });
});

describe('TC-RL-SVC-005 consumeRateLimit', () => {
  it('uses fallback values when insert-return row is missing and now is not provided', async () => {
    jest.resetModules();
    const rateLimitService = await import('../../../src/services/requestRateLimitService.js');

    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await rateLimitService.consumeRateLimit(
      {
        keyHash: 'key-hash-2',
        routeKey: 'route-key-2',
        limit: 5,
        windowSeconds: 60,
      },
      db,
    );

    expect(result.requestCount).toBe(0);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-RL-SVC-006 key normalization', () => {
  it('normalizes non-empty components for protected and login route keys', async () => {
    jest.resetModules();
    const rateLimitService = await import('../../../src/services/requestRateLimitService.js');

    const protectedKey = rateLimitService.buildProtectedRouteRateLimitKey({
      ipAddress: ' 203.0.113.99 ',
      userId: 42,
      routeId: ' TASK.CREATE ',
      secret: 'secret-rl-3',
    });
    const expectedProtected = rateLimitService.hashRateLimitKey(
      '203.0.113.99:42:task.create',
      'secret-rl-3',
    );
    expect(protectedKey).toBe(expectedProtected);

    const loginKey = rateLimitService.buildLoginRouteRateLimitKey({
      ipAddress: ' 198.51.100.22 ',
      normalizedEmail: ' Student@Example.COM ',
      routeId: ' AUTH.LOGIN ',
      secret: 'secret-rl-4',
    });
    const expectedLogin = rateLimitService.hashRateLimitKey(
      '198.51.100.22:student@example.com:auth.login',
      'secret-rl-4',
    );
    expect(loginKey).toBe(expectedLogin);
  });
});

describe('TC-RL-SVC-007 default db wiring', () => {
  it('uses default pool db for ensure/consume and normalizes nullish key components', async () => {
    jest.resetModules();
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ request_count: 1, expires_at: '2099-01-01T00:00:00.000Z' }] });

    jest.doMock('../../../src/config/database.js', () => ({
      __esModule: true,
      default: { query },
    }));

    const rateLimitService = await import('../../../src/services/requestRateLimitService.js');

    await rateLimitService.ensureRequestRateLimitSchema();
    const result = await rateLimitService.consumeRateLimit({
      keyHash: 'default-key',
      routeKey: 'default-route',
      limit: 2,
      windowSeconds: 60,
      now: new Date('2026-04-13T00:00:00.000Z'),
    });

    expect(result.allowed).toBe(true);
    expect(result.requestCount).toBe(1);

    const fallbackKey = rateLimitService.buildProtectedRouteRateLimitKey({
      ipAddress: undefined as unknown as string,
      userId: undefined as unknown as number,
      routeId: undefined as unknown as string,
      secret: 'secret-rl-5',
    });
    const expected = rateLimitService.hashRateLimitKey('unknown-ip:unknown-user:unknown-route', 'secret-rl-5');
    expect(fallbackKey).toBe(expected);
  });
});
