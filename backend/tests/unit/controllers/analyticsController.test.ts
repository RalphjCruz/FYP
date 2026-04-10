import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import { getMyAnalyticsSummary } from '../../../src/controllers/analyticsController.js';
import * as analyticsService from '../../../src/services/analyticsService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-ANCTRL-001 getMyAnalyticsSummary', () => {
  it('returns 401 and exits early when authenticated user is missing', async () => {
    const req = { user: undefined } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;

    await getMyAnalyticsSummary(req, res);

    expect(summaryMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-ANCTRL-002 getMyAnalyticsSummary', () => {
  it('returns analytics summary payload for authenticated user', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockResolvedValue({
      tasks: { total: 10, completed: 4, completionRatePercent: 40, completedLast7Days: [] },
      xp: { totalExperience: 550, level: 3, gainedLast7Days: [] },
      achievements: { unlockedCount: 7 },
    });

    await getMyAnalyticsSummary(req, res);

    expect(summaryMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        tasks: { total: 10, completed: 4, completionRatePercent: 40, completedLast7Days: [] },
        xp: { totalExperience: 550, level: 3, gainedLast7Days: [] },
        achievements: { unlockedCount: 7 },
      },
    });
  });
});

describe('TC-ANCTRL-003 getMyAnalyticsSummary', () => {
  it('returns 500 with Error.message when analytics service throws Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockRejectedValue(new Error('analytics failed'));

    await getMyAnalyticsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'analytics failed',
    });
  });
});

describe('TC-ANCTRL-004 getMyAnalyticsSummary', () => {
  it('returns 500 fallback message when analytics service throws non-Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const summaryMock = jest.spyOn(analyticsService, 'getAnalyticsSummary') as unknown as jest.Mock;
    summaryMock.mockRejectedValue('analytics-non-error');

    await getMyAnalyticsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to fetch analytics summary',
    });
  });
});
