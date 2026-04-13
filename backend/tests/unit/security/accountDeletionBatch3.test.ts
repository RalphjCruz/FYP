import type { Response } from 'express';
import pool from '../../../src/config/database.js';
import {
  cancelAccountDeletionController,
  getAccountDeletionStatusController,
  requestAccountDeletionController,
} from '../../../src/controllers/accountController.js';
import {
  cancelAccountDeletion,
  requestAccountDeletion,
} from '../../../src/services/accountDeletionService.js';
import * as accountDeletionService from '../../../src/services/accountDeletionService.js';
import * as operationalAuditLogService from '../../../src/services/operationalAuditLogService.js';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-B3-DEL-001 requestAccountDeletion', () => {
  it('creates a pending deletion request when none exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 12,
              status: 'pending',
              requested_at: '2026-04-13T10:00:00.000Z',
              scheduled_purge_at: '2026-04-20T10:00:00.000Z',
              cancelled_at: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await requestAccountDeletion(12, '203.0.113.50');

    expect(result).toEqual({
      status: 'pending',
      requestedAt: '2026-04-13T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
      cancelledAt: null,
      idempotent: false,
    });
    expect(
      queryMock.mock.calls.some((call: [string]) => call[0].includes('INSERT INTO user_deletion_requests')),
    ).toBe(true);
  });
});

describe('TC-B3-DEL-002 requestAccountDeletion', () => {
  it('returns idempotent result when pending deletion already exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 13,
              status: 'pending',
              requested_at: '2026-04-10T10:00:00.000Z',
              scheduled_purge_at: '2026-04-17T10:00:00.000Z',
              cancelled_at: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await requestAccountDeletion(13, '203.0.113.51');

    expect(result.idempotent).toBe(true);
    expect(result.status).toBe('pending');
    expect(
      queryMock.mock.calls.some((call: [string]) => call[0].includes('INSERT INTO user_deletion_requests')),
    ).toBe(false);
    expect(
      queryMock.mock.calls.some((call: [string]) => call[0].includes('UPDATE user_deletion_requests')),
    ).toBe(false);
  });
});

describe('TC-B3-DEL-003 cancelAccountDeletion', () => {
  it('returns idempotent none status when no deletion request exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await cancelAccountDeletion(14);

    expect(result).toEqual({
      status: 'none',
      requestedAt: null,
      scheduledPurgeAt: null,
      cancelledAt: null,
      idempotent: true,
    });
  });
});

describe('TC-B3-DEL-004 cancelAccountDeletion', () => {
  it('marks pending deletion as cancelled', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 15,
              status: 'pending',
              requested_at: '2026-04-11T10:00:00.000Z',
              scheduled_purge_at: '2026-04-18T10:00:00.000Z',
              cancelled_at: null,
            },
          ],
        };
      }
      if (sql.includes('UPDATE user_deletion_requests')) {
        return {
          rows: [
            {
              user_id: 15,
              status: 'cancelled',
              requested_at: '2026-04-11T10:00:00.000Z',
              scheduled_purge_at: '2026-04-18T10:00:00.000Z',
              cancelled_at: '2026-04-12T10:00:00.000Z',
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await cancelAccountDeletion(15);

    expect(result.idempotent).toBe(false);
    expect(result.status).toBe('cancelled');
    expect(result.cancelledAt).toBe('2026-04-12T10:00:00.000Z');
  });
});

describe('TC-B3-DEL-005 getAccountDeletionStatusController', () => {
  it('returns deletion status payload for authenticated user', async () => {
    const req = {
      user: { id: 16, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();
    const statusSpy = jest.spyOn(accountDeletionService, 'getAccountDeletionStatus') as unknown as jest.Mock;
    statusSpy.mockResolvedValue({
      status: 'pending',
      requestedAt: '2026-04-13T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
      cancelledAt: null,
    });

    await getAccountDeletionStatusController(req, res);

    expect(statusSpy).toHaveBeenCalledWith(16);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        status: 'pending',
        requestedAt: '2026-04-13T10:00:00.000Z',
        scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
        cancelledAt: null,
      },
    });
  });
});

describe('TC-B3-DEL-006 account deletion audit events', () => {
  it('writes operational audit events for request and cancel actions', async () => {
    const requestReq = {
      user: { id: 17, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.52',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const cancelReq = {
      user: { id: 17, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.52',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const requestRes = createMockResponse();
    const cancelRes = createMockResponse();

    const requestSpy = jest.spyOn(accountDeletionService, 'requestAccountDeletion') as unknown as jest.Mock;
    requestSpy.mockResolvedValue({
      status: 'pending',
      requestedAt: '2026-04-13T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
      cancelledAt: null,
      idempotent: false,
    });
    const cancelSpy = jest.spyOn(accountDeletionService, 'cancelAccountDeletion') as unknown as jest.Mock;
    cancelSpy.mockResolvedValue({
      status: 'cancelled',
      requestedAt: '2026-04-13T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
      cancelledAt: '2026-04-13T11:00:00.000Z',
      idempotent: false,
    });
    const auditSpy = jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock;
    auditSpy.mockResolvedValue(undefined);

    await requestAccountDeletionController(requestReq, requestRes);
    await cancelAccountDeletionController(cancelReq, cancelRes);

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account_deletion_requested',
        actorUserId: 17,
      }),
    );
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account_deletion_cancelled',
        actorUserId: 17,
      }),
    );
  });
});
