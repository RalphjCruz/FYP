import type { Request, Response } from 'express';
import { env } from '../../../src/config/env.js';
import { login } from '../../../src/controllers/authController.js';
import * as authAccountService from '../../../src/services/authAccountService.js';
import * as authSecurityService from '../../../src/services/authSecurityService.js';
import * as rateLimitService from '../../../src/services/requestRateLimitService.js';

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
  (env as { nodeEnv: string }).nodeEnv = 'test';
});

describe('TC-B5-RL-001 normalizeEmailForRateLimit', () => {
  it('trims and lowercases email values before key generation', () => {
    const normalized = rateLimitService.normalizeEmailForRateLimit('  Student@Example.COM  ');
    expect(normalized).toBe('student@example.com');
  });
});

describe('TC-B5-RL-002 buildLoginRouteRateLimitKey', () => {
  it('produces stable key for normalized email variants on same IP+route', () => {
    const keyA = rateLimitService.buildLoginRouteRateLimitKey({
      ipAddress: '203.0.113.77',
      normalizedEmail: 'Student@Example.COM',
      routeId: 'auth.login',
      secret: 'secret-1',
    });
    const keyB = rateLimitService.buildLoginRouteRateLimitKey({
      ipAddress: '203.0.113.77',
      normalizedEmail: '  student@example.com  ',
      routeId: 'auth.login',
      secret: 'secret-1',
    });

    expect(keyA).toBe(keyB);
  });
});

describe('TC-B5-RL-003 buildProtectedRouteRateLimitKey', () => {
  it('changes when IP/user/route differs and stays stable for same normalized tuple', () => {
    const base = rateLimitService.buildProtectedRouteRateLimitKey({
      ipAddress: '203.0.113.88',
      userId: 42,
      routeId: 'account.export',
      secret: 'secret-2',
    });
    const sameNormalized = rateLimitService.buildProtectedRouteRateLimitKey({
      ipAddress: ' 203.0.113.88 ',
      userId: 42,
      routeId: 'Account.Export',
      secret: 'secret-2',
    });
    const differentUser = rateLimitService.buildProtectedRouteRateLimitKey({
      ipAddress: '203.0.113.88',
      userId: 43,
      routeId: 'account.export',
      secret: 'secret-2',
    });

    expect(base).toBe(sameNormalized);
    expect(base).not.toBe(differentUser);
  });
});

describe('TC-B5-RL-004 login Retry-After contract', () => {
  it('sets Retry-After when login is blocked by active lock status', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.90',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: true,
      lockedUntil: new Date(Date.now() + 5 * 60_000).toISOString(),
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    await login(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(429);
  });
});

describe('TC-B5-RL-005 login Retry-After contract', () => {
  it('sets Retry-After when failed attempt transitions to locked state', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.91',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();
    const lockUntil = new Date(Date.now() + 4 * 60_000).toISOString();

    (jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock).mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 4,
      remainingAttempts: 1,
    });
    (jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock).mockResolvedValue(null);
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

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(429);
  });
});

describe('TC-B5-RL-006 login request-rate-limit contract', () => {
  it('returns 429 with Retry-After when login request rate limit is exceeded', async () => {
    (env as { nodeEnv: string }).nodeEnv = 'development';

    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.92',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const consumeRateLimitMock = jest.spyOn(rateLimitService, 'consumeRateLimit') as unknown as jest.Mock;
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      requestCount: 99,
      retryAfterSeconds: 45,
    });

    await login(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '45');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  });
});
