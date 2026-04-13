import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { login } from '../../../src/controllers/authController.js';
import { requireAuth } from '../../../src/middlewares/authMiddleware.js';
import * as authAccountService from '../../../src/services/authAccountService.js';
import * as authSecurityService from '../../../src/services/authSecurityService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  return { status, json, setHeader } as unknown as Response & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-B1-SEC-001 requireAuth inactive-user enforcement', () => {
  it('returns 401 generic token error when JWT is valid but user is inactive', async () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer valid-token'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    (jest.spyOn(jwt, 'verify') as unknown as jest.Mock).mockReturnValue({
      sub: '9',
      email: 'inactive@example.com',
      username: 'inactive',
    });
    (jest.spyOn(authAccountService, 'isUserActiveById') as unknown as jest.Mock).mockResolvedValue(false);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('TC-B1-SEC-002 requireAuth active-user enforcement', () => {
  it('calls next when JWT is valid and user is active', async () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer valid-token'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    (jest.spyOn(jwt, 'verify') as unknown as jest.Mock).mockReturnValue({
      sub: '10',
      email: 'active@example.com',
      username: 'active',
    });
    (jest.spyOn(authAccountService, 'isUserActiveById') as unknown as jest.Mock).mockResolvedValue(true);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('TC-B1-SEC-003 login non-disclosure for inactive account', () => {
  it('returns the same 401 Invalid credentials response used for unknown users', async () => {
    const req = {
      body: {
        email: 'inactive@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.7',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });
    (jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock).mockResolvedValue({
      id: 44,
      email: 'inactive@example.com',
      username: 'inactive',
      passwordHash: 'hash',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    (jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });
    const passwordMatchMock = jest.spyOn(authAccountService, 'isPasswordMatch') as unknown as jest.Mock;
    passwordMatchMock.mockResolvedValue(true);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid credentials',
    });
    expect(passwordMatchMock).not.toHaveBeenCalled();
  });
});

describe('TC-B1-SEC-004 login failed-attempt attribution for inactive account', () => {
  it('records failed login attempt with inactive user id and client IP', async () => {
    const req = {
      body: {
        email: 'inactive@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.9',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });
    (jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock).mockResolvedValue({
      id: 45,
      email: 'inactive@example.com',
      username: 'inactive',
      passwordHash: 'hash',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });

    await login(req, res);

    expect(failedAttemptMock).toHaveBeenCalledWith('inactive@example.com', '203.0.113.9', 45);
  });
});

describe('TC-B1-SEC-005 login lockout branch for inactive account', () => {
  it('returns 429 when inactive-account failed attempt triggers lockout threshold', async () => {
    const req = {
      body: {
        email: 'inactive@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.10',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 4,
      remainingAttempts: 1,
    });
    (jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock).mockResolvedValue({
      id: 46,
      email: 'inactive@example.com',
      username: 'inactive',
      passwordHash: 'hash',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const lockUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    (jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock).mockResolvedValue({
      isLocked: true,
      lockedUntil: lockUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });
    (jest.spyOn(authSecurityService, 'getLoginSecurityPolicy') as unknown as jest.Mock).mockReturnValue({
      maxAttempts: 5,
      windowMinutes: 15,
      lockMinutes: 15,
    });

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: expect.objectContaining({
          lockedUntil: lockUntil,
          minutesRemaining: expect.any(Number),
        }),
      }),
    );
  });
});

describe('TC-B1-SEC-006 login non-disclosure parity', () => {
  it('returns identical 401 payload for unknown-user and inactive-user cases', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.11',
      headers: {},
    } as unknown as Request;
    const resUnknown = createMockResponse();
    const resInactive = createMockResponse();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });
    const findUserMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });

    findUserMock.mockResolvedValueOnce(null);
    await login(req, resUnknown);

    findUserMock.mockResolvedValueOnce({
      id: 47,
      email: 'student@example.com',
      username: 'inactive',
      passwordHash: 'hash',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await login(req, resInactive);

    expect(resUnknown.status).toHaveBeenCalledWith(401);
    expect(resInactive.status).toHaveBeenCalledWith(401);
    expect(resUnknown.json.mock.calls[0][0]).toEqual(resInactive.json.mock.calls[0][0]);
  });
});
