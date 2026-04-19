import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authAccountService from '../../src/services/authAccountService.js';
import * as accountDeletionService from '../../src/services/accountDeletionService.js';
import * as accountService from '../../src/services/accountService.js';
import * as operationalAuditLogService from '../../src/services/operationalAuditLogService.js';
import * as rateLimitService from '../../src/services/requestRateLimitService.js';

const app = createApp({
  nodeEnv: 'test',
  corsOrigins: [],
});

const createAuthToken = (userId: number, email = 'int@example.com', username = 'integration-user') =>
  jwt.sign(
    {
      sub: String(userId),
      email,
      username,
    },
    env.jwtSecret,
    { expiresIn: '1h' },
  );

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  (jest.spyOn(authAccountService, 'isUserActiveById') as unknown as jest.Mock).mockResolvedValue(true);
});

describe('TC-ACCINT-001 GET /api/account/deletion/status', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).get('/api/account/deletion/status');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-ACCINT-002 GET /api/account/export', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app).get('/api/account/export').set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-ACCINT-003 GET /api/account/deletion/status', () => {
  it('returns deletion status payload for authenticated user', async () => {
    const statusMock = jest.spyOn(accountDeletionService, 'getAccountDeletionStatus') as unknown as jest.Mock;
    statusMock.mockResolvedValue({
      status: 'pending',
      requestedAt: '2026-04-12T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-19T10:00:00.000Z',
      cancelledAt: null,
    });

    const token = createAuthToken(7);
    const response = await request(app).get('/api/account/deletion/status').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(statusMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'pending',
        requestedAt: '2026-04-12T10:00:00.000Z',
        scheduledPurgeAt: '2026-04-19T10:00:00.000Z',
        cancelledAt: null,
      },
    });
  });
});

describe('TC-ACCINT-004 POST /api/account/deletion/request', () => {
  it('creates deletion request and returns success payload', async () => {
    const requestDeletionMock = jest.spyOn(accountDeletionService, 'requestAccountDeletion') as unknown as jest.Mock;
    requestDeletionMock.mockResolvedValue({
      status: 'pending',
      requestedAt: '2026-04-12T10:00:00.000Z',
      scheduledPurgeAt: '2026-04-19T10:00:00.000Z',
      cancelledAt: null,
      idempotent: false,
    });
    const auditMock = jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/account/deletion/request')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(requestDeletionMock).toHaveBeenCalledWith(7, expect.any(String));
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account_deletion_requested',
        actorUserId: 7,
      }),
    );
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'pending',
        requestedAt: '2026-04-12T10:00:00.000Z',
        scheduledPurgeAt: '2026-04-19T10:00:00.000Z',
        cancelledAt: null,
        idempotent: false,
      },
      message: 'Account deletion requested successfully',
    });
  });
});

describe('TC-ACCINT-005 GET /api/account/export', () => {
  it('returns 429 with Retry-After when export cooldown is exceeded', async () => {
    const consumeRateLimitMock = jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock;
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      requestCount: 2,
      retryAfterSeconds: 120,
    });

    const token = createAuthToken(7);
    const response = await request(app).get('/api/account/export').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('120');
    expect(response.body).toEqual({
      success: false,
      message: 'Too many export requests. Please try again later.',
    });
  });
});

describe('TC-ACCINT-006 GET /api/account/export', () => {
  it('returns export payload when authenticated user is under cooldown limit', async () => {
    const consumeRateLimitMock = jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock;
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      requestCount: 1,
      retryAfterSeconds: 3600,
    });
    const exportMock = jest.spyOn(accountService, 'buildAccountDataExport') as unknown as jest.Mock;
    exportMock.mockResolvedValue({
      format: 'json',
      exportedAt: '2026-04-19T10:00:00.000Z',
      user: {
        id: 7,
        email: 'student@example.com',
        username: 'student',
        isActive: true,
      },
      domains: {
        tasks: [],
      },
    });
    const auditMock = jest.spyOn(operationalAuditLogService, 'logOperationalAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    const token = createAuthToken(7, 'student@example.com', 'student');
    const response = await request(app).get('/api/account/export').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(exportMock).toHaveBeenCalledWith(7);
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account_export_requested',
        actorUserId: 7,
      }),
    );
    expect(response.body).toEqual({
      success: true,
      data: {
        format: 'json',
        exportedAt: '2026-04-19T10:00:00.000Z',
        user: {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          isActive: true,
        },
        domains: {
          tasks: [],
        },
      },
    });
  });
});
