import pool from '../../../src/config/database.js';
import {
  clearLoginFailures,
  getClientIp,
  getLoginSecurityPolicy,
  getLoginSecurityStatus,
  logAuthAuditEvent,
  recordFailedLoginAttempt,
} from '../../../src/services/authSecurityService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ASEC-001 getClientIp', () => {
  it('returns the first forwarded IP when x-forwarded-for string has multiple values', () => {
    const result = getClientIp('10.0.0.5', '203.0.113.42, 198.51.100.11');

    expect(result).toBe('203.0.113.42');
  });
});

describe('TC-ASEC-002 getClientIp', () => {
  it('returns the first IP when x-forwarded-for is provided as an array', () => {
    const result = getClientIp('10.0.0.5', ['198.51.100.8', '198.51.100.9']);

    expect(result).toBe('198.51.100.8');
  });
});

describe('TC-ASEC-003 getClientIp', () => {
  it('falls back to request IP when forwarded header is missing', () => {
    const result = getClientIp('10.0.0.5', undefined);

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-004 getClientIp', () => {
  it('returns unknown when neither forwarded header nor request IP is available', () => {
    const result = getClientIp(undefined, undefined);

    expect(result).toBe('unknown');
  });
});

describe('TC-ASEC-005 getLoginSecurityPolicy', () => {
  it('returns configured login lockout policy values', () => {
    const policy = getLoginSecurityPolicy();

    expect(policy).toEqual({
      maxAttempts: 5,
      windowMinutes: 15,
      lockMinutes: 15,
    });
  });
});

describe('TC-ASEC-006 getClientIp', () => {
  it('falls back to request IP when forwarded header is blank', () => {
    const result = getClientIp('10.0.0.5', '   ');

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-007 getClientIp', () => {
  it('falls back to request IP when forwarded header array has blank first entry', () => {
    const result = getClientIp('10.0.0.5', ['   ', '198.51.100.10']);

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-008 getClientIp', () => {
  it('falls back to request IP when forwarded header first comma segment is blank', () => {
    const result = getClientIp('10.0.0.5', '   , 198.51.100.11');

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-009 getClientIp', () => {
  it('returns trimmed forwarded IP when header contains a single spaced value', () => {
    const result = getClientIp('10.0.0.5', '  203.0.113.77  ');

    expect(result).toBe('203.0.113.77');
  });
});

describe('TC-ASEC-010 getLoginSecurityPolicy', () => {
  it('returns a fresh policy object per call so external mutation does not persist', () => {
    const first = getLoginSecurityPolicy();
    first.maxAttempts = 99;

    const second = getLoginSecurityPolicy();

    expect(second).toEqual({
      maxAttempts: 5,
      windowMinutes: 15,
      lockMinutes: 15,
    });
  });
});

describe('TC-ASEC-011 getClientIp', () => {
  it('falls back to request IP when forwarded header array is empty', () => {
    const result = getClientIp('10.0.0.5', []);

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-012 logAuthAuditEvent', () => {
  it('writes auth audit event to database with expected payload', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({ rows: [] });

    await logAuthAuditEvent({
      eventType: 'login_success',
      email: 'student@example.com',
      ipAddress: '203.0.113.42',
      details: 'User login successful.',
    });

    const insertCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO auth_audit_logs'),
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual([null, 'student@example.com', '203.0.113.42', 'login_success', 'User login successful.']);
  });
});

describe('TC-ASEC-021 logAuthAuditEvent', () => {
  it('stores null details when optional details field is omitted', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockResolvedValue({ rows: [] });

    await logAuthAuditEvent({
      eventType: 'login_failure',
      email: 'student@example.com',
      ipAddress: '203.0.113.42',
      userId: 7,
    });

    const insertCall = queryMock.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO auth_audit_logs'),
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.[1]).toEqual([7, 'student@example.com', '203.0.113.42', 'login_failure', null]);
  });
});

describe('TC-ASEC-013 getLoginSecurityStatus', () => {
  it('returns locked status when lock period is still active', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const windowStartedAt = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 5,
              window_started_at: windowStartedAt,
              locked_until: lockedUntil,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const status = await getLoginSecurityStatus('student@example.com');

    expect(status).toEqual({
      isLocked: true,
      lockedUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const updateCall = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE auth_login_guards'));
    expect(updateCall).toBeUndefined();
  });
});

describe('TC-ASEC-022 getLoginSecurityStatus', () => {
  it('returns zero attempts in status when lock is active but failure window is expired', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const expiredWindowStart = new Date(Date.now() - 30 * 60_000).toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 5,
              window_started_at: expiredWindowStart,
              locked_until: lockedUntil,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const status = await getLoginSecurityStatus('student@example.com');

    expect(status).toEqual({
      isLocked: true,
      lockedUntil,
      failedAttempts: 0,
      remainingAttempts: 5,
    });
  });
});

describe('TC-ASEC-014 getLoginSecurityStatus', () => {
  it('resets expired lock state and returns unlocked status', async () => {
    const pastWindow = new Date(Date.now() - 30 * 60_000).toISOString();
    const expiredLock = new Date(Date.now() - 5 * 60_000).toISOString();
    const resetWindow = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 5,
              window_started_at: pastWindow,
              locked_until: expiredLock,
            },
          ],
        };
      }

      if (sql.includes('UPDATE auth_login_guards')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 0,
              window_started_at: resetWindow,
              locked_until: null,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const status = await getLoginSecurityStatus('student@example.com');

    expect(status).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    const updateCall = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE auth_login_guards'));
    expect(updateCall).toBeDefined();
  });
});

describe('TC-ASEC-018 getLoginSecurityStatus', () => {
  it('creates guard record when missing and returns default unlocked status', async () => {
    const createdAt = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO auth_login_guards')) {
        return {
          rows: [
            {
              email: 'new-user@example.com',
              failed_attempts: 0,
              window_started_at: createdAt,
              locked_until: null,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const status = await getLoginSecurityStatus('new-user@example.com');

    expect(status).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    const insertCall = queryMock.mock.calls.find((call) => String(call[0]).includes('INSERT INTO auth_login_guards'));
    expect(insertCall).toBeDefined();
  });
});

describe('TC-ASEC-015 recordFailedLoginAttempt', () => {
  it('increments failed attempts inside active window and logs login_failure event', async () => {
    const windowStartedAt = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 1,
              window_started_at: windowStartedAt,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('UPDATE auth_login_guards')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 2,
              window_started_at: windowStartedAt,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO auth_audit_logs')) {
        expect(params).toEqual([7, 'student@example.com', '203.0.113.42', 'login_failure', expect.any(String)]);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const status = await recordFailedLoginAttempt('student@example.com', '203.0.113.42', 7);

    expect(status).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 2,
      remainingAttempts: 3,
    });
  });
});

describe('TC-ASEC-016 recordFailedLoginAttempt', () => {
  it('locks account at threshold and logs login_locked event', async () => {
    const windowStartedAt = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 4,
              window_started_at: windowStartedAt,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('UPDATE auth_login_guards')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 5,
              window_started_at: windowStartedAt,
              locked_until: new Date(Date.now() + 15 * 60_000).toISOString(),
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO auth_audit_logs')) {
        expect(params).toEqual([7, 'student@example.com', '203.0.113.42', 'login_locked', expect.any(String)]);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const status = await recordFailedLoginAttempt('student@example.com', '203.0.113.42', 7);

    expect(status.isLocked).toBe(true);
    expect(status.lockedUntil).toEqual(expect.any(String));
    expect(status.failedAttempts).toBe(5);
    expect(status.remainingAttempts).toBe(0);
  });
});

describe('TC-ASEC-017 recordFailedLoginAttempt', () => {
  it('returns locked status without incrementing when account is already locked', async () => {
    const windowStartedAt = new Date().toISOString();
    const lockedUntil = new Date(Date.now() + 15 * 60_000).toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 5,
              window_started_at: windowStartedAt,
              locked_until: lockedUntil,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO auth_audit_logs')) {
        expect(params).toEqual([
          7,
          'student@example.com',
          '203.0.113.42',
          'login_blocked_locked',
          'Login blocked because account is currently locked.',
        ]);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const status = await recordFailedLoginAttempt('student@example.com', '203.0.113.42', 7);

    expect(status).toEqual({
      isLocked: true,
      lockedUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const updateCall = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE auth_login_guards'));
    expect(updateCall).toBeUndefined();
  });
});

describe('TC-ASEC-019 clearLoginFailures', () => {
  it('resets failed attempts and lock state for the given email', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('UPDATE auth_login_guards')) {
        expect(params?.[0]).toBe('student@example.com');
        expect(params?.[1]).toBe(0);
        expect(params?.[3]).toBeNull();
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 0,
              window_started_at: new Date().toISOString(),
              locked_until: null,
            },
          ],
        };
      }

      return { rows: [] };
    });

    await clearLoginFailures('student@example.com');

    const updateCall = queryMock.mock.calls.find((call) => String(call[0]).includes('UPDATE auth_login_guards'));
    expect(updateCall).toBeDefined();
  });
});

describe('TC-ASEC-020 recordFailedLoginAttempt', () => {
  it('resets failure window when previous window expired and starts count from one', async () => {
    const expiredWindowStart = new Date(Date.now() - 30 * 60_000).toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 4,
              window_started_at: expiredWindowStart,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('UPDATE auth_login_guards')) {
        expect(params?.[1]).toBe(1);
        expect(params?.[3]).toBeNull();
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 1,
              window_started_at: new Date().toISOString(),
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO auth_audit_logs')) {
        expect(params).toEqual([7, 'student@example.com', '203.0.113.42', 'login_failure', expect.any(String)]);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const status = await recordFailedLoginAttempt('student@example.com', '203.0.113.42', 7);

    expect(status).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });
  });
});

describe('TC-ASEC-023 recordFailedLoginAttempt', () => {
  it('logs null user_id in audit event when failed login attempt has no userId', async () => {
    const windowStartedAt = new Date().toISOString();

    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT email, failed_attempts, window_started_at, locked_until')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 0,
              window_started_at: windowStartedAt,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('UPDATE auth_login_guards')) {
        return {
          rows: [
            {
              email: 'student@example.com',
              failed_attempts: 1,
              window_started_at: windowStartedAt,
              locked_until: null,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO auth_audit_logs')) {
        expect(params).toEqual([null, 'student@example.com', '203.0.113.42', 'login_failure', expect.any(String)]);
        return { rows: [] };
      }

      return { rows: [] };
    });

    const status = await recordFailedLoginAttempt('student@example.com', '203.0.113.42');

    expect(status).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });
  });
});
