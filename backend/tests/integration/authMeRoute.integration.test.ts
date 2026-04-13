import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authAccountService from '../../src/services/authAccountService.js';

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

describe('TC-AUTHINT-001 GET /api/auth/me', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-AUTHINT-002 GET /api/auth/me', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-AUTHINT-003 GET /api/auth/me', () => {
  it('returns authenticated profile payload when user exists', async () => {
    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockResolvedValue({
      id: 7,
      email: 'student@example.com',
      username: 'student',
      createdAt: '2026-01-10T00:00:00.000Z',
    });

    const token = createAuthToken(7, 'student@example.com', 'student');
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(profileMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 7,
        email: 'student@example.com',
        username: 'student',
        createdAt: '2026-01-10T00:00:00.000Z',
      },
    });
  });
});

describe('TC-AUTHINT-004 GET /api/auth/me', () => {
  it('returns 404 when authenticated user profile is not found', async () => {
    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockResolvedValue(null);

    const token = createAuthToken(8, 'missing@example.com', 'missing-user');
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'User not found',
    });
  });
});

describe('TC-AUTHINT-005 GET /api/auth/me', () => {
  it('returns 500 when profile lookup throws unexpected error', async () => {
    const profileMock = jest.spyOn(authAccountService, 'getUserProfileById') as unknown as jest.Mock;
    profileMock.mockRejectedValue(new Error('profile lookup failed'));

    const token = createAuthToken(9, 'error@example.com', 'error-user');
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to fetch profile',
    });
  });
});
