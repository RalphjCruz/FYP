import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authAccountService from '../../src/services/authAccountService.js';
import * as analyticsService from '../../src/services/analyticsService.js';

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

describe('TC-ANINT-001 GET /api/analytics/me/summary', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).get('/api/analytics/me/summary');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-ANINT-002 GET /api/analytics/me/summary', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app).get('/api/analytics/me/summary').set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-ANINT-003 GET /api/analytics/me/summary', () => {
  it('returns analytics summary payload for authenticated request', async () => {
    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockResolvedValue({
      tasks: { total: 12, completed: 6, completionRatePercent: 50, completedLast7Days: [] },
      xp: { totalExperience: 700, level: 4, gainedLast7Days: [] },
      achievements: { unlockedCount: 8 },
    });

    const token = createAuthToken(7);
    const response = await request(app).get('/api/analytics/me/summary').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(summaryMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      data: {
        tasks: { total: 12, completed: 6, completionRatePercent: 50, completedLast7Days: [] },
        xp: { totalExperience: 700, level: 4, gainedLast7Days: [] },
        achievements: { unlockedCount: 8 },
      },
    });
  });
});

describe('TC-ANINT-004 GET /api/analytics/me/summary', () => {
  it('maps analytics service Error failures to 500 with Error.message', async () => {
    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockRejectedValue(new Error('analytics service failed'));

    const token = createAuthToken(8);
    const response = await request(app).get('/api/analytics/me/summary').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'analytics service failed',
    });
  });
});

describe('TC-ANINT-005 GET /api/analytics/me/summary', () => {
  it('maps analytics service non-Error failures to fallback 500 message', async () => {
    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockRejectedValue('analytics-non-error');

    const token = createAuthToken(9);
    const response = await request(app).get('/api/analytics/me/summary').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to fetch analytics summary',
    });
  });
});
