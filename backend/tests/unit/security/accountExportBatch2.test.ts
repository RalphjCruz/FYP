import type { Request, Response } from 'express';
import pool from '../../../src/config/database.js';
import { exportAccountDataController } from '../../../src/controllers/accountController.js';
import { buildAccountDataExport } from '../../../src/services/accountService.js';
import * as accountService from '../../../src/services/accountService.js';
import * as operationalAuditLogService from '../../../src/services/operationalAuditLogService.js';
import * as rateLimitService from '../../../src/services/requestRateLimitService.js';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  return { status, json, setHeader } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
    setHeader: jest.Mock;
  };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-B2-EXP-001 buildAccountDataExport', () => {
  it('scopes export queries to authenticated user id filters', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM users')) {
        return {
          rows: [
            {
              id: 7,
              email: 'student@example.com',
              username: 'student',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('SELECT to_regclass')) {
        return { rows: [{ regclass: params?.[0] }] };
      }

      return { rows: [] };
    });

    await buildAccountDataExport(7);

    const scopedCalls = queryMock.mock.calls.filter((call: [string, unknown[]]) => {
      const sql = call[0];
      return sql.includes('WHERE user_id = $1') || sql.includes('WHERE id = $1');
    });

    expect(scopedCalls.length).toBeGreaterThan(1);
    for (const call of scopedCalls) {
      expect(call[1]).toEqual([7]);
    }
  });
});

describe('TC-B2-EXP-002 buildAccountDataExport', () => {
  it('returns structured JSON grouped by domain entity', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM users')) {
        return {
          rows: [
            {
              id: 9,
              email: 'student@example.com',
              username: 'student',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('SELECT to_regclass')) {
        return { rows: [{ regclass: params?.[0] }] };
      }

      if (sql.includes('FROM tasks')) {
        return { rows: [{ id: 1, user_id: 9, title: 'Task A' }] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [{ id: 2, user_id: 9, name: 'My Slime' }] };
      }

      return { rows: [] };
    });

    const result = await buildAccountDataExport(9);

    expect(result.format).toBe('json');
    expect(result.user.id).toBe(9);
    expect(result.domains).toEqual(
      expect.objectContaining({
        slime: expect.anything(),
        tasks: expect.any(Array),
        focus: expect.objectContaining({
          sessions: expect.any(Array),
          dailyAggregates: expect.any(Array),
        }),
        achievements: expect.objectContaining({
          unlocked: expect.any(Array),
        }),
        customization: expect.objectContaining({
          inventory: expect.any(Array),
          loadout: expect.any(Array),
        }),
        security: expect.objectContaining({
          authAuditLogs: expect.any(Array),
        }),
      }),
    );
  });
});

describe('TC-B2-EXP-003 buildAccountDataExport', () => {
  it('returns null/empty domain values when optional tables are not present', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM users')) {
        return {
          rows: [
            {
              id: 11,
              email: 'student@example.com',
              username: 'student',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('SELECT to_regclass')) {
        const tableName = String(params?.[0] ?? '');
        if (tableName === 'public.tasks' || tableName === 'public.slimes') {
          return { rows: [{ regclass: tableName }] };
        }
        return { rows: [{ regclass: null }] };
      }

      if (sql.includes('FROM tasks')) {
        return { rows: [] };
      }

      if (sql.includes('FROM slimes')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await buildAccountDataExport(11);

    expect(result.domains.slime).toBeNull();
    expect(result.domains.tasks).toEqual([]);
    expect(result.domains.focus.sessions).toEqual([]);
    expect(result.domains.customization.wallet).toBeNull();
    expect(result.domains.security.authAuditLogs).toEqual([]);
  });
});

describe('TC-B2-EXP-004 exportAccountDataController', () => {
  it('returns 401 when authenticated user id is missing', async () => {
    const req = { user: undefined } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await exportAccountDataController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-B2-EXP-005 exportAccountDataController', () => {
  it('returns 429 with Retry-After when export cooldown is exceeded', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.40',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const limiterMock = jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock;
    limiterMock.mockResolvedValue({
      allowed: false,
      requestCount: 2,
      retryAfterSeconds: 120,
    });

    await exportAccountDataController(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many export requests. Please try again later.',
    });
  });
});

describe('TC-B2-EXP-006 exportAccountDataController', () => {
  it('returns export payload for authenticated user when under cooldown limit', async () => {
    const req = {
      user: { id: 8, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.41',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const limiterMock = jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock;
    limiterMock.mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });

    const exportMock = jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock;
    exportMock.mockResolvedValue({
      format: 'json',
      exportedAt: '2026-04-13T00:00:00.000Z',
      user: { id: 8, email: 'student@example.com', username: 'student', isActive: true },
      domains: { tasks: [] },
    });
    const auditMock = jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await exportAccountDataController(req, res);

    expect(limiterMock).toHaveBeenCalled();
    expect(exportMock).toHaveBeenCalledWith(8);
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account_export_requested',
        actorUserId: 8,
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        format: 'json',
        user: expect.objectContaining({ id: 8 }),
      }),
    });
  });
});
