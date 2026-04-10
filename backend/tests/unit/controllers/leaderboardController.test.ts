import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import { getGlobalLeaderboardController } from '../../../src/controllers/leaderboardController.js';
import * as leaderboardService from '../../../src/services/leaderboardService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-LBCTRL-001 getGlobalLeaderboardController', () => {
  it('returns 401 and exits early when authenticated user is missing', async () => {
    const req = { user: undefined, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;

    await getGlobalLeaderboardController(req, res);

    expect(leaderboardMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-LBCTRL-002 getGlobalLeaderboardController', () => {
  it('parses numeric query limit and returns leaderboard payload', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      query: { limit: '15' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockResolvedValue([
      {
        rank: 1,
        userId: 7,
        username: 'student',
        level: 4,
        totalExperience: 600,
        completedTasks: 22,
        unlockedAchievements: 6,
        dayStreak: 4,
      },
    ]);

    await getGlobalLeaderboardController(req, res);

    expect(leaderboardMock).toHaveBeenCalledWith(15);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          rank: 1,
          userId: 7,
          username: 'student',
          level: 4,
          totalExperience: 600,
          completedTasks: 22,
          unlockedAchievements: 6,
          dayStreak: 4,
        },
      ],
    });
  });
});

describe('TC-LBCTRL-003 getGlobalLeaderboardController', () => {
  it('falls back query limit to default when query value is malformed', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      query: { limit: 'invalid-limit' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockResolvedValue([]);

    await getGlobalLeaderboardController(req, res);

    expect(leaderboardMock).toHaveBeenCalledWith(20);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });
});

describe('TC-LBCTRL-004 getGlobalLeaderboardController', () => {
  it('returns 500 with Error.message when leaderboard service throws Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      query: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockRejectedValue(new Error('leaderboard failed'));

    await getGlobalLeaderboardController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'leaderboard failed',
    });
  });
});

describe('TC-LBCTRL-005 getGlobalLeaderboardController', () => {
  it('returns 500 fallback message when leaderboard service throws non-Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      query: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const leaderboardMock = jest.spyOn(leaderboardService, 'getGlobalLeaderboard') as unknown as jest.Mock;
    leaderboardMock.mockRejectedValue('leaderboard-non-error');

    await getGlobalLeaderboardController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to fetch global leaderboard',
    });
  });
});
