import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { login, register } from '../controllers/authController.js';
import pool from '../config/database.js';
import * as authSecurityService from '../services/authSecurityService.js';

jest.mock('../config/database.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('../services/authSecurityService.js', () => ({
  clearLoginFailures: jest.fn(),
  getClientIp: jest.fn(() => '127.0.0.1'),
  getLoginSecurityPolicy: jest.fn(() => ({ maxAttempts: 5, windowMinutes: 15, lockMinutes: 15 })),
  getLoginSecurityStatus: jest.fn(),
  logAuthAuditEvent: jest.fn(),
  recordFailedLoginAttempt: jest.fn(),
}));

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: null,
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockImplementation((code: number) => {
    response.statusCode = code;
    return response;
  });

  response.json.mockImplementation((payload: unknown) => {
    response.body = payload;
    return response;
  });

  return response;
};

const mockPool = pool as unknown as {
  query: jest.Mock;
  connect: jest.Mock;
};

const mockBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};

const mockJwt = jwt as unknown as {
  sign: jest.Mock;
};

const mockSecurity = authSecurityService as unknown as {
  clearLoginFailures: jest.Mock;
  getLoginSecurityStatus: jest.Mock;
  recordFailedLoginAttempt: jest.Mock;
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user successfully', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            id: 11,
            email: 'student@example.com',
            username: 'student',
            password_hash: 'hash',
            created_at: '2026-02-18T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const release = jest.fn();

    mockPool.connect.mockResolvedValue({
      query: clientQuery,
      release,
    });

    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockJwt.sign.mockReturnValue('jwt-token');

    const request = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'password123',
      },
      ip: '127.0.0.1',
      headers: {},
    };

    const response = createMockResponse();
    await register(request as any, response as any);

    expect(response.statusCode).toBe(201);
    expect((response.body as any).success).toBe(true);
    expect((response.body as any).data.token).toBe('jwt-token');
    expect((response.body as any).data.user.email).toBe('student@example.com');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate email during register', async () => {
    const duplicateError = {
      code: '23505',
      detail: 'Key (email)=(student@example.com) already exists.',
    };

    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(duplicateError)
      .mockResolvedValueOnce({});

    const release = jest.fn();
    mockPool.connect.mockResolvedValue({
      query: clientQuery,
      release,
    });

    mockBcrypt.hash.mockResolvedValue('hashed-password');

    const request = {
      body: {
        username: 'student',
        email: 'student@example.com',
        password: 'password123',
      },
      ip: '127.0.0.1',
      headers: {},
    };

    const response = createMockResponse();
    await register(request as any, response as any);

    expect(response.statusCode).toBe(409);
    expect((response.body as any).message).toBe('Email already in use');
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('logs in successfully and clears prior failures', async () => {
    mockSecurity.getLoginSecurityStatus.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 5,
          email: 'student@example.com',
          username: 'student',
          password_hash: 'stored-hash',
          created_at: '2026-02-18T00:00:00.000Z',
        },
      ],
    });

    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue('login-token');

    const request = {
      body: {
        email: 'student@example.com',
        password: 'password123',
      },
      ip: '127.0.0.1',
      headers: {},
    };

    const response = createMockResponse();
    await login(request as any, response as any);

    expect(response.statusCode).toBe(200);
    expect((response.body as any).success).toBe(true);
    expect((response.body as any).data.token).toBe('login-token');
    expect(mockSecurity.clearLoginFailures).toHaveBeenCalledWith('student@example.com');
  });

  it('returns invalid credentials when password is wrong', async () => {
    mockSecurity.getLoginSecurityStatus.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 6,
          email: 'student@example.com',
          username: 'student',
          password_hash: 'stored-hash',
          created_at: '2026-02-18T00:00:00.000Z',
        },
      ],
    });

    mockBcrypt.compare.mockResolvedValue(false);
    mockSecurity.recordFailedLoginAttempt.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 1,
      remainingAttempts: 4,
    });

    const request = {
      body: {
        email: 'student@example.com',
        password: 'wrong-password',
      },
      ip: '127.0.0.1',
      headers: {},
    };

    const response = createMockResponse();
    await login(request as any, response as any);

    expect(response.statusCode).toBe(401);
    expect((response.body as any).message).toBe('Invalid credentials');
  });

  it('locks account on 5th failed login attempt', async () => {
    mockSecurity.getLoginSecurityStatus.mockResolvedValue({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: 5,
    });

    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 7,
          email: 'student@example.com',
          username: 'student',
          password_hash: 'stored-hash',
          created_at: '2026-02-18T00:00:00.000Z',
        },
      ],
    });

    mockBcrypt.compare.mockResolvedValue(false);

    const lockUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    mockSecurity.recordFailedLoginAttempt
      .mockResolvedValueOnce({ isLocked: false, lockedUntil: null, failedAttempts: 1, remainingAttempts: 4 })
      .mockResolvedValueOnce({ isLocked: false, lockedUntil: null, failedAttempts: 2, remainingAttempts: 3 })
      .mockResolvedValueOnce({ isLocked: false, lockedUntil: null, failedAttempts: 3, remainingAttempts: 2 })
      .mockResolvedValueOnce({ isLocked: false, lockedUntil: null, failedAttempts: 4, remainingAttempts: 1 })
      .mockResolvedValueOnce({ isLocked: true, lockedUntil: lockUntil, failedAttempts: 5, remainingAttempts: 0 });

    const statuses: number[] = [];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const request = {
        body: {
          email: 'student@example.com',
          password: 'wrong-password',
        },
        ip: '127.0.0.1',
        headers: {},
      };

      const response = createMockResponse();
      await login(request as any, response as any);
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 4)).toEqual([401, 401, 401, 401]);
    expect(statuses[4]).toBe(429);
  });

  it('returns minutesRemaining when already locked', async () => {
    const lockUntil = new Date(Date.now() + 8 * 60_000).toISOString();
    mockSecurity.getLoginSecurityStatus.mockResolvedValue({
      isLocked: true,
      lockedUntil: lockUntil,
      failedAttempts: 5,
      remainingAttempts: 0,
    });

    const request = {
      body: {
        email: 'student@example.com',
        password: 'password123',
      },
      ip: '127.0.0.1',
      headers: {},
    };

    const response = createMockResponse();
    await login(request as any, response as any);

    expect(response.statusCode).toBe(429);
    expect((response.body as any).data.minutesRemaining).toBeGreaterThanOrEqual(1);
    expect((response.body as any).message).toContain('Try again in about');
  });
});
