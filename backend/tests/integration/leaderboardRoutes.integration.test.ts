import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as leaderboardService from '../../src/services/leaderboardService.js';

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

describe('TC-LBINT-001 GET /api/leaderboard/global', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).get('/api/leaderboard/global');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-LBINT-002 GET /api/leaderboard/global', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app).get('/api/leaderboard/global').set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-LBINT-003 GET /api/leaderboard/global', () => {
  it('passes parsed limit through middleware+controller stack and returns service payload', async () => {
    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockResolvedValue([
      {
        rank: 1,
        userId: 7,
        username: 'alpha',
        level: 5,
        totalExperience: 800,
        completedTasks: 30,
        unlockedAchievements: 7,
        dayStreak: 5,
      },
    ]);

    const token = createAuthToken(7);
    const response = await request(app).get('/api/leaderboard/global?limit=15').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(leaderboardMock).toHaveBeenCalledWith(15);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          rank: 1,
          userId: 7,
          username: 'alpha',
          level: 5,
          totalExperience: 800,
          completedTasks: 30,
          unlockedAchievements: 7,
          dayStreak: 5,
        },
      ],
    });
  });
});

describe('TC-LBINT-004 GET /api/leaderboard/global', () => {
  it('uses default limit for malformed query and maps Error failures to 500', async () => {
    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockRejectedValue(new Error('leaderboard service failed'));

    const token = createAuthToken(8);
    const response = await request(app)
      .get('/api/leaderboard/global?limit=not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(leaderboardMock).toHaveBeenCalledWith(20);
    expect(response.body).toEqual({
      success: false,
      message: 'leaderboard service failed',
    });
  });
});

describe('TC-LBINT-005 GET /api/leaderboard/global', () => {
  it('maps non-Error service failures to fallback 500 message', async () => {
    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockRejectedValue('non-error-failure');

    const token = createAuthToken(9);
    const response = await request(app).get('/api/leaderboard/global').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Failed to fetch global leaderboard',
    });
  });
});
