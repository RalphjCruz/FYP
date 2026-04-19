import type { Response } from 'express';
import {
  cancelAccountDeletionController,
  exportAccountDataController,
  getAccountDeletionStatusController,
  requestAccountDeletionController,
} from '../../../src/controllers/accountController.js';
import { AccountServiceError } from '../../../src/services/accountService.js';
import * as accountDeletionService from '../../../src/services/accountDeletionService.js';
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

describe('TC-ACCCTRL-001 exportAccountDataController', () => {
  it('continues successfully when operational audit logging fails', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.1',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock).mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });
    (jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock).mockResolvedValue({
      format: 'json',
      exportedAt: '2026-04-19T00:00:00.000Z',
      user: { id: 7 },
      domains: { tasks: [] },
    });
    (jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock).mockRejectedValue(
      new Error('audit write failed'),
    );
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await exportAccountDataController(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write operational audit event:', expect.any(Error));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ format: 'json' }),
    });
  });
});

describe('TC-ACCCTRL-002 exportAccountDataController', () => {
  it('returns 404 when account service reports ACCOUNT_NOT_FOUND', async () => {
    const req = {
      user: { id: 999, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.2',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock).mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });
    (jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock).mockRejectedValue(
      new AccountServiceError('ACCOUNT_NOT_FOUND', 'Account not found'),
    );

    await exportAccountDataController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Account not found',
    });
  });
});

describe('TC-ACCCTRL-003 exportAccountDataController', () => {
  it('returns 500 fallback message when non-Error is thrown', async () => {
    const req = {
      user: { id: 8, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.3',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock).mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });
    (jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock).mockRejectedValue('export-failed');

    await exportAccountDataController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to export account data',
    });
  });
});

describe('TC-ACCCTRL-004 getAccountDeletionStatusController', () => {
  it('returns 500 fallback message when non-Error is thrown', async () => {
    const req = {
      user: { id: 9, email: 'student@example.com', username: 'student' },
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'getAccountDeletionStatus') as unknown as jest.Mock).mockRejectedValue(
      'status-read-failed',
    );

    await getAccountDeletionStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to read account deletion status',
    });
  });
});

describe('TC-ACCCTRL-005 requestAccountDeletionController', () => {
  it('returns 500 fallback message when non-Error is thrown', async () => {
    const req = {
      user: { id: 10, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.4',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'requestAccountDeletion') as unknown as jest.Mock).mockRejectedValue(
      'request-failed',
    );

    await requestAccountDeletionController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to request account deletion',
    });
  });
});

describe('TC-ACCCTRL-006 cancelAccountDeletionController', () => {
  it('returns 500 fallback message when non-Error is thrown', async () => {
    const req = {
      user: { id: 11, email: 'student@example.com', username: 'student' },
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'cancelAccountDeletion') as unknown as jest.Mock).mockRejectedValue(
      'cancel-failed',
    );

    await cancelAccountDeletionController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to cancel account deletion request',
    });
  });
});

describe('TC-ACCCTRL-007 protected account controllers', () => {
  it('returns 401 when authenticated user is missing on deletion status, request, and cancel routes', async () => {
    const req = { user: undefined, headers: {}, ip: '203.0.113.5' } as unknown as AuthenticatedRequest;

    const statusRes = createMockResponse();
    await getAccountDeletionStatusController(req, statusRes);
    expect(statusRes.status).toHaveBeenCalledWith(401);
    expect(statusRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });

    const requestRes = createMockResponse();
    await requestAccountDeletionController(req, requestRes);
    expect(requestRes.status).toHaveBeenCalledWith(401);
    expect(requestRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });

    const cancelRes = createMockResponse();
    await cancelAccountDeletionController(req, cancelRes);
    expect(cancelRes.status).toHaveBeenCalledWith(401);
    expect(cancelRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-ACCCTRL-008 exportAccountDataController', () => {
  it('returns 500 with Error.message when account export fails with an Error', async () => {
    const req = {
      user: { id: 12, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.6',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock).mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });
    (jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock).mockRejectedValue(
      new Error('export failed hard'),
    );

    await exportAccountDataController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'export failed hard',
    });
  });
});

describe('TC-ACCCTRL-009 getAccountDeletionStatusController', () => {
  it('returns 500 with Error.message when status fetch fails with an Error', async () => {
    const req = {
      user: { id: 13, email: 'student@example.com', username: 'student' },
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'getAccountDeletionStatus') as unknown as jest.Mock).mockRejectedValue(
      new Error('status fetch failed'),
    );

    await getAccountDeletionStatusController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'status fetch failed',
    });
  });
});

describe('TC-ACCCTRL-010 requestAccountDeletionController', () => {
  it('returns idempotent pending message when deletion request already exists', async () => {
    const req = {
      user: { id: 14, email: 'student@example.com', username: 'student' },
      ip: '203.0.113.7',
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'requestAccountDeletion') as unknown as jest.Mock).mockResolvedValue({
      status: 'pending',
      requestedAt: '2026-04-13T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-20T10:00:00.000Z',
      cancelledAt: null,
      idempotent: true,
    });
    (jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock).mockResolvedValue(
      undefined,
    );

    await requestAccountDeletionController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ idempotent: true }),
      message: 'Account deletion request already pending',
    });
  });
});

describe('TC-ACCCTRL-011 cancelAccountDeletionController', () => {
  it('returns idempotent cancel message when no pending request exists', async () => {
    const req = {
      user: { id: 15, email: 'student@example.com', username: 'student' },
      headers: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    (jest.spyOn(accountDeletionService, 'cancelAccountDeletion') as unknown as jest.Mock).mockResolvedValue({
      status: 'none',
      requestedAt: null,
      scheduledPurgeAt: null,
      cancelledAt: null,
      idempotent: true,
    });
    (jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock).mockResolvedValue(
      undefined,
    );

    await cancelAccountDeletionController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ idempotent: true }),
      message: 'No pending deletion request to cancel',
    });
  });
});

describe('TC-ACCCTRL-012 account deletion controllers', () => {
  it('returns 500 with Error.message for request and cancel failures', async () => {
    const requestReq = {
      user: { id: 16, email: 'student@example.com', username: 'student' },
      headers: {},
      ip: '203.0.113.8',
    } as unknown as AuthenticatedRequest;
    const cancelReq = {
      user: { id: 17, email: 'student@example.com', username: 'student' },
      headers: {},
    } as unknown as AuthenticatedRequest;

    const requestRes = createMockResponse();
    const cancelRes = createMockResponse();

    (jest.spyOn(accountDeletionService, 'requestAccountDeletion') as unknown as jest.Mock).mockRejectedValue(
      new Error('request deletion failed'),
    );
    (jest.spyOn(accountDeletionService, 'cancelAccountDeletion') as unknown as jest.Mock).mockRejectedValue(
      new Error('cancel deletion failed'),
    );

    await requestAccountDeletionController(requestReq, requestRes);
    await cancelAccountDeletionController(cancelReq, cancelRes);

    expect(requestRes.status).toHaveBeenCalledWith(500);
    expect(requestRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'request deletion failed',
    });
    expect(cancelRes.status).toHaveBeenCalledWith(500);
    expect(cancelRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'cancel deletion failed',
    });
  });
});
