import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import { getMe, login, register } from '../../../src/controllers/authController.js';
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

describe('TC-ACTRL-001 login', () => {
  it('returns 400 when login payload has invalid email format', async () => {
    const req = {
      body: {
        email: 'not-an-email',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email and password are required',
    });
  });
});

describe('TC-ACTRL-002 login', () => {
  it('returns 400 when login payload password is empty', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: '',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email and password are required',
    });
  });
});

describe('TC-ACTRL-003 getMe', () => {
  it('returns 401 when authenticated user id is missing', async () => {
    const req = {
      user: undefined,
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized',
    });
  });
});

describe('TC-ACTRL-004 getMe', () => {
  it('returns 404 when authenticated user profile is not found', async () => {
    const req = {
      user: { id: 999 },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockResolvedValue(null);

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
  });
});

describe('TC-ACTRL-005 getMe', () => {
  it('returns public user profile when authenticated user exists', async () => {
    const req = {
      user: { id: 7 },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockResolvedValue({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      createdAt: '2026-01-01T12:00:00.000Z',
    });

    await getMe(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        id: 7,
        email: 'student@example.com',
        username: 'student',
        createdAt: '2026-01-01T12:00:00.000Z',
      },
    });
  });
});

describe('TC-ACTRL-006 login', () => {
  it('returns 429 when account is currently locked', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: true,
      lockedUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Account temporarily locked due to repeated failed logins'),
        data: expect.objectContaining({
          lockedUntil: expect.any(String),
          minutesRemaining: expect.any(Number),
        }),
      }),
    );
  });
});

describe('TC-ACTRL-007 login', () => {
  it('returns 401 when user is not found and failed attempt does not lock account', async () => {
    const req = {
      body: {
        email: 'missing@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    const userLookupMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    userLookupMock.mockResolvedValue(null);

    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });

    await login(req, res);

    expect(failedAttemptMock).toHaveBeenCalledWith('missing@example.com', '203.0.113.42', undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid credentials',
    });
  });
});

describe('TC-ACTRL-008 login', () => {
  it('returns 429 when user is not found and failed attempt triggers account lock', async () => {
    const req = {
      body: {
        email: 'missing@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 4,
      remainingAttempts: 1,
    });

    const userLookupMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    userLookupMock.mockResolvedValue(null);

    const lockedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: true,
      lockedUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const policyMock = jest.spyOn(authSecurityService, 'getLoginSecurityPolicy') as unknown as jest.Mock;
    policyMock.mockReturnValue({
      maxAttempts: 5,
      windowMinutes: 15,
      lockMinutes: 15,
    });

    await login(req, res);

    expect(failedAttemptMock).toHaveBeenCalledWith('missing@example.com', '203.0.113.42', undefined);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Account temporarily locked after 5 failed attempts in 15 minutes.'),
        data: expect.objectContaining({
          lockedUntil,
          minutesRemaining: expect.any(Number),
        }),
      }),
    );
  });
});

describe('TC-ACTRL-009 login', () => {
  it('returns 401 when user exists but password comparison fails and account stays unlocked', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'wrong-password',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    const userLookupMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    userLookupMock.mockResolvedValue({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: '2026-01-01T12:00:00.000Z',
    });

    const passwordMatchMock = jest.spyOn(authAccountService, 'isPasswordMatch') as unknown as jest.Mock;
    passwordMatchMock.mockResolvedValue(false);

    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });

    await login(req, res);

    expect(passwordMatchMock).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    expect(failedAttemptMock).toHaveBeenCalledWith('student@example.com', '203.0.113.42', 7);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid credentials',
    });
  });
});

describe('TC-ACTRL-010 login', () => {
  it('returns success payload with token when credentials are valid', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    const userLookupMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    userLookupMock.mockResolvedValue({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: '2026-01-01T12:00:00.000Z',
    });

    const passwordMatchMock = jest.spyOn(authAccountService, 'isPasswordMatch') as unknown as jest.Mock;
    passwordMatchMock.mockResolvedValue(true);

    const clearFailuresMock = jest.spyOn(authSecurityService, 'clearLoginFailures') as unknown as jest.Mock;
    clearFailuresMock.mockResolvedValue(undefined);

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    const tokenMock = jest.spyOn(jwt, 'sign') as unknown as jest.Mock;
    tokenMock.mockReturnValue('mock-jwt-token');

    await login(req, res);

    expect(clearFailuresMock).toHaveBeenCalledWith('student@example.com');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Login successful',
      data: {
        token: 'mock-jwt-token',
        user: {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          createdAt: '2026-01-01T12:00:00.000Z',
        },
      },
    });
  });
});

describe('TC-ACTRL-011 login', () => {
  it('returns 500 and logs login_failure when an unexpected error occurs', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockRejectedValue(new Error('unexpected'));

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await login(req, res);

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'login_failure',
        email: 'student@example.com',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to login',
    });
  });
});

describe('TC-ACTRL-012 register', () => {
  it('returns 400 and logs register_failed when registration payload is invalid', async () => {
    const req = {
      body: {
        username: 'ab',
        email: '  Student@Example.COM  ',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'register_failed',
        email: 'student@example.com',
        details: 'Username must be at least 3 characters long',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Username must be at least 3 characters long',
    });
  });
});

describe('TC-ACTRL-013 register', () => {
  it('returns 409 when email is already in use', async () => {
    const req = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const registerMock = jest.spyOn(authAccountService, 'registerUserWithSlime') as unknown as jest.Mock;
    registerMock.mockRejectedValue(
      new authAccountService.AuthAccountServiceError('EMAIL_IN_USE', 'Email already in use'),
    );

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email already in use',
    });
  });
});

describe('TC-ACTRL-014 register', () => {
  it('returns 409 when username is already in use', async () => {
    const req = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const registerMock = jest.spyOn(authAccountService, 'registerUserWithSlime') as unknown as jest.Mock;
    registerMock.mockRejectedValue(
      new authAccountService.AuthAccountServiceError('USERNAME_IN_USE', 'Username already in use'),
    );

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Username already in use',
    });
  });
});

describe('TC-ACTRL-015 register', () => {
  it('returns 409 when generic duplicate user condition is raised', async () => {
    const req = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const registerMock = jest.spyOn(authAccountService, 'registerUserWithSlime') as unknown as jest.Mock;
    registerMock.mockRejectedValue(
      new authAccountService.AuthAccountServiceError('USER_EXISTS', 'User already exists'),
    );

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User already exists',
    });
  });
});

describe('TC-ACTRL-016 login', () => {
  it('returns 429 when password is wrong and failed attempt triggers lockout', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'wrong-password',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 4,
      remainingAttempts: 1,
    });

    const userLookupMock = jest.spyOn(authAccountService, 'findUserCredentialsByEmail') as unknown as jest.Mock;
    userLookupMock.mockResolvedValue({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: '2026-01-01T12:00:00.000Z',
    });

    const passwordMatchMock = jest.spyOn(authAccountService, 'isPasswordMatch') as unknown as jest.Mock;
    passwordMatchMock.mockResolvedValue(false);

    const lockedUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    const failedAttemptMock = jest.spyOn(authSecurityService, 'recordFailedLoginAttempt') as unknown as jest.Mock;
    failedAttemptMock.mockResolvedValue({
      isLocked: true,
      lockedUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const policyMock = jest.spyOn(authSecurityService, 'getLoginSecurityPolicy') as unknown as jest.Mock;
    policyMock.mockReturnValue({
      maxAttempts: 5,
      windowMinutes: 15,
      lockMinutes: 15,
    });

    await login(req, res);

    expect(passwordMatchMock).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    expect(failedAttemptMock).toHaveBeenCalledWith('student@example.com', '203.0.113.42', 7);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Account temporarily locked after 5 failed attempts in 15 minutes.'),
        data: expect.objectContaining({
          lockedUntil,
          minutesRemaining: expect.any(Number),
        }),
      }),
    );
  });
});

describe('TC-ACTRL-017 register', () => {
  it('returns 201 with token and user payload when registration succeeds', async () => {
    const req = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const registerMock = jest.spyOn(authAccountService, 'registerUserWithSlime') as unknown as jest.Mock;
    registerMock.mockResolvedValue({
      user: {
        id: 7,
        username: 'student',
        email: 'student@example.com',
        createdAt: '2026-01-01T12:00:00.000Z',
      },
      slimeId: 99,
    });

    const tokenMock = jest.spyOn(jwt, 'sign') as unknown as jest.Mock;
    tokenMock.mockReturnValue('mock-register-token');

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(registerMock).toHaveBeenCalledWith({
      username: 'student',
      email: 'student@example.com',
      password: 'securePass123',
      passwordHashRounds: 10,
    });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'register_success',
        email: 'student@example.com',
        userId: 7,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Registration successful',
      data: {
        token: 'mock-register-token',
        user: {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          createdAt: '2026-01-01T12:00:00.000Z',
        },
      },
    });
  });
});

describe('TC-ACTRL-018 register', () => {
  it('returns 500 when unexpected registration error occurs', async () => {
    const req = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const registerMock = jest.spyOn(authAccountService, 'registerUserWithSlime') as unknown as jest.Mock;
    registerMock.mockRejectedValue(new Error('unexpected'));

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await register(req, res);

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'register_failed',
        email: 'student@example.com',
        details: 'Unexpected registration error.',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to register user',
    });
  });
});

describe('TC-ACTRL-019 getMe', () => {
  it('returns 500 when profile lookup throws unexpected error', async () => {
    const req = {
      user: { id: 7 },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockRejectedValue(new Error('db unavailable'));

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to fetch profile',
    });
  });
});

describe('TC-ACTRL-020 login', () => {
  it('returns 429 with 0 minutes remaining when account is marked locked without lockedUntil timestamp', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: true,
      lockedUntil: null,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: expect.objectContaining({
          lockedUntil: null,
          minutesRemaining: 0,
        }),
      }),
    );
  });
});

describe('TC-ACTRL-021 login', () => {
  it('returns 429 with 0 minutes remaining when lockedUntil is already in the past', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: true,
      lockedUntil: new Date(Date.now() - 60_000).toISOString(),
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockResolvedValue(undefined);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: expect.objectContaining({
          minutesRemaining: 0,
        }),
      }),
    );
  });
});

describe('TC-ACTRL-022 register', () => {
  it('still returns 400 when audit logging fails during invalid registration payload handling', async () => {
    const req = {
      body: {
        username: 'ab',
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockRejectedValue(new Error('audit write failed'));

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Username must be at least 3 characters long',
    });
  });
});

describe('TC-ACTRL-023 login', () => {
  it('still returns 429 lock response when audit logging fails for a locked account', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockResolvedValue({
      isLocked: true,
      lockedUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockRejectedValue(new Error('audit write failed'));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Account temporarily locked due to repeated failed logins'),
      }),
    );
  });
});

describe('TC-ACTRL-024 login', () => {
  it('still returns 500 when login fails and audit logging also fails', async () => {
    const req = {
      body: {
        email: 'student@example.com',
        password: 'securePass123',
      },
      ip: '203.0.113.42',
      headers: {},
    } as unknown as Request;
    const res = createMockResponse();

    const securityStatusMock = jest.spyOn(authSecurityService, 'getLoginSecurityStatus') as unknown as jest.Mock;
    securityStatusMock.mockRejectedValue(new Error('unexpected'));

    const auditMock = jest.spyOn(authSecurityService, 'logAuthAuditEvent') as unknown as jest.Mock;
    auditMock.mockRejectedValue(new Error('audit write failed'));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to login',
    });
  });
});
