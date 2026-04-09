import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import {
  addSlimeXpDev,
  createTestUser,
  getSlimeStats,
  healthCheck,
  resetSlimeAchievementsDev,
  resetSlimeXpDev,
} from '../../../src/controllers/slimeController.js';
import pool from '../../../src/config/database.js';
import { SlimeProfileServiceError } from '../../../src/services/slimeProfileService.js';
import * as requestAuthValidators from '../../../src/controllers/validators/requestAuth.js';
import * as slimeDevService from '../../../src/services/slimeDevService.js';
import * as slimeRequestValidators from '../../../src/controllers/validators/slimeRequestValidators.js';
import * as slimeProfileService from '../../../src/services/slimeProfileService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-SCTRL-001 getSlimeStats', () => {
  it('returns 400 when neither authenticated nor route user id resolves', async () => {
    const req = { params: {}, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(null);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(null);

    await getSlimeStats(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid userId',
    });
  });
});

describe('TC-SCTRL-002 getSlimeStats', () => {
  it('returns 403 when authenticated user and route user id mismatch', async () => {
    const req = { params: { userId: '8' }, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(7);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(8);

    await getSlimeStats(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Forbidden: user mismatch',
    });
  });
});

describe('TC-SCTRL-003 getSlimeStats', () => {
  it('uses authenticated user id and returns slime payload on success', async () => {
    const req = { params: {}, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(7);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(null);
    jest.spyOn(slimeRequestValidators, 'parseSimulatedDayOffset').mockReturnValue(0);
    jest.spyOn(slimeRequestValidators, 'resolveSimulatedNowUtc').mockReturnValue(undefined);

    const payload = { id: 3, name: 'My Slime' } as any;
    const buildMock = jest.spyOn(slimeProfileService, 'buildSlimeStatsPayload') as unknown as jest.Mock;
    buildMock.mockResolvedValue(payload);

    await getSlimeStats(req, res);

    expect(buildMock).toHaveBeenCalledWith({
      userId: 7,
      simulatedNowUtc: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: payload,
    });
  });
});

describe('TC-SCTRL-004 getSlimeStats', () => {
  it('uses route user id when unauthenticated and forwards simulated day offset flow', async () => {
    const req = { params: { userId: '9' }, query: { simulatedDayOffset: '2' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(null);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(9);

    const parseOffsetMock = jest.spyOn(slimeRequestValidators, 'parseSimulatedDayOffset');
    parseOffsetMock.mockReturnValue(2);

    const simulatedNow = new Date('2026-04-08T10:00:00.000Z');
    const resolveNowMock = jest.spyOn(slimeRequestValidators, 'resolveSimulatedNowUtc');
    resolveNowMock.mockReturnValue(simulatedNow);

    const buildMock = jest.spyOn(slimeProfileService, 'buildSlimeStatsPayload') as unknown as jest.Mock;
    buildMock.mockResolvedValue({ id: 5, name: 'Route Slime' });

    await getSlimeStats(req, res);

    expect(parseOffsetMock).toHaveBeenCalledWith('2');
    expect(resolveNowMock).toHaveBeenCalledWith(2, expect.any(String));
    expect(buildMock).toHaveBeenCalledWith({
      userId: 9,
      simulatedNowUtc: simulatedNow,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 5, name: 'Route Slime' },
    });
  });
});

describe('TC-SCTRL-005 getSlimeStats', () => {
  it('maps SLIME_NOT_FOUND service error to 404 response', async () => {
    const req = { params: {}, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(7);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(null);
    jest.spyOn(slimeRequestValidators, 'parseSimulatedDayOffset').mockReturnValue(0);
    jest.spyOn(slimeRequestValidators, 'resolveSimulatedNowUtc').mockReturnValue(undefined);

    const notFoundError = new SlimeProfileServiceError('SLIME_NOT_FOUND', 'No slime exists for this user. Create a user first!');
    const buildMock = jest.spyOn(slimeProfileService, 'buildSlimeStatsPayload') as unknown as jest.Mock;
    buildMock.mockRejectedValue(notFoundError);

    await getSlimeStats(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Slime not found',
      message: 'No slime exists for this user. Create a user first!',
    });
  });
});

describe('TC-SCTRL-006 getSlimeStats', () => {
  it('maps unexpected errors to 500 with safe error payload', async () => {
    const req = { params: {}, query: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'getAuthenticatedUserId').mockReturnValue(7);
    jest.spyOn(slimeRequestValidators, 'parseUserId').mockReturnValue(null);
    jest.spyOn(slimeRequestValidators, 'parseSimulatedDayOffset').mockReturnValue(0);
    jest.spyOn(slimeRequestValidators, 'resolveSimulatedNowUtc').mockReturnValue(undefined);

    const buildMock = jest.spyOn(slimeProfileService, 'buildSlimeStatsPayload') as unknown as jest.Mock;
    buildMock.mockRejectedValue(new Error('db exploded'));

    await getSlimeStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Database error',
      message: 'db exploded',
    });
  });
});

describe('TC-SCTRL-007 addSlimeXpDev', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: { amount: 120 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const addXpMock = jest.spyOn(slimeDevService, 'addSlimeXpDevForUser') as unknown as jest.Mock;

    await addSlimeXpDev(req, res);

    expect(addXpMock).not.toHaveBeenCalled();
  });
});

describe('TC-SCTRL-008 addSlimeXpDev', () => {
  it('defaults invalid amount to 50 and returns success payload', async () => {
    const req = { body: { amount: -10 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const addXpMock = jest.spyOn(slimeDevService, 'addSlimeXpDevForUser') as unknown as jest.Mock;
    addXpMock.mockResolvedValue({
      level: 2,
      totalExperience: 150,
      experienceIntoLevel: 50,
      experienceForNextLevel: 128,
      experienceToNextLevel: 78,
      levelProgressPercent: 39.06,
      evolutionStage: 1,
      achievementsUnlocked: [],
    });

    await addSlimeXpDev(req, res);

    expect(addXpMock).toHaveBeenCalledWith(7, 50);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Added 50 XP',
      data: {
        level: 2,
        totalExperience: 150,
        experienceIntoLevel: 50,
        experienceForNextLevel: 128,
        experienceToNextLevel: 78,
        levelProgressPercent: 39.06,
        evolutionStage: 1,
        achievementsUnlocked: [],
      },
    });
  });
});

describe('TC-SCTRL-009 addSlimeXpDev', () => {
  it('returns 400 fallback message when add XP service throws non-Error value', async () => {
    const req = { body: { amount: 100 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const addXpMock = jest.spyOn(slimeDevService, 'addSlimeXpDevForUser') as unknown as jest.Mock;
    addXpMock.mockRejectedValue('failed');

    await addSlimeXpDev(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to add XP',
    });
  });
});

describe('TC-SCTRL-010 dev reset endpoints', () => {
  it('returns success payloads and fallback 400 responses for reset XP and achievements flows', async () => {
    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const resetXpMock = jest.spyOn(slimeDevService, 'resetSlimeXpDevForUser') as unknown as jest.Mock;
    resetXpMock.mockResolvedValueOnce({
      totalExperience: 0,
      level: 1,
      evolutionStage: 1,
      experienceIntoLevel: 0,
      experienceForNextLevel: 100,
      experienceToNextLevel: 100,
      levelProgressPercent: 0,
    });
    resetXpMock.mockRejectedValueOnce('xp reset failed');

    const resetAchievementsMock = jest.spyOn(slimeDevService, 'resetSlimeAchievementsDevForUser') as unknown as jest.Mock;
    resetAchievementsMock.mockResolvedValueOnce({ deletedCount: 2 });
    resetAchievementsMock.mockRejectedValueOnce('achievement reset failed');

    const req = { body: {} } as unknown as AuthenticatedRequest;

    const resXpSuccess = createMockResponse();
    await resetSlimeXpDev(req, resXpSuccess);
    expect(resXpSuccess.json).toHaveBeenCalledWith({
      success: true,
      message: 'Slime XP reset to zero',
      data: {
        totalExperience: 0,
        level: 1,
        evolutionStage: 1,
        experienceIntoLevel: 0,
        experienceForNextLevel: 100,
        experienceToNextLevel: 100,
        levelProgressPercent: 0,
      },
    });

    const resXpFail = createMockResponse();
    await resetSlimeXpDev(req, resXpFail);
    expect(resXpFail.status).toHaveBeenCalledWith(400);
    expect(resXpFail.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to reset slime XP',
    });

    const resAchievementSuccess = createMockResponse();
    await resetSlimeAchievementsDev(req, resAchievementSuccess);
    expect(resAchievementSuccess.json).toHaveBeenCalledWith({
      success: true,
      message: 'Achievements reset',
      data: { deletedCount: 2 },
    });

    const resAchievementFail = createMockResponse();
    await resetSlimeAchievementsDev(req, resAchievementFail);
    expect(resAchievementFail.status).toHaveBeenCalledWith(400);
    expect(resAchievementFail.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to reset achievements',
    });
  });
});

describe('TC-SCTRL-011 createTestUser', () => {
  it('returns created/existing messages and maps non-Error failures to unknown error', async () => {
    const createUserMock = jest.spyOn(slimeDevService, 'createOrGetTestUserWithSlime') as unknown as jest.Mock;
    createUserMock
      .mockResolvedValueOnce({
        user: { id: 7, email: 'test@myslime.com', username: 'TestUser' },
        slime: { id: 3, user_id: 7, name: 'Slimey' },
        userCreated: true,
        slimeCreated: false,
      })
      .mockResolvedValueOnce({
        user: { id: 7, email: 'test@myslime.com', username: 'TestUser' },
        slime: { id: 3, user_id: 7, name: 'Slimey' },
        userCreated: false,
        slimeCreated: false,
      })
      .mockRejectedValueOnce('create failed');

    const req = {} as any;

    const resCreated = createMockResponse();
    await createTestUser(req, resCreated);
    expect(resCreated.json).toHaveBeenCalledWith({
      success: true,
      message: 'Test user and slime created!',
      data: {
        user: { id: 7, email: 'test@myslime.com', username: 'TestUser' },
        slime: { id: 3, user_id: 7, name: 'Slimey' },
      },
    });

    const resExisting = createMockResponse();
    await createTestUser(req, resExisting);
    expect(resExisting.json).toHaveBeenCalledWith({
      success: true,
      message: 'Test user and slime already exist.',
      data: {
        user: { id: 7, email: 'test@myslime.com', username: 'TestUser' },
        slime: { id: 3, user_id: 7, name: 'Slimey' },
      },
    });

    const resFail = createMockResponse();
    await createTestUser(req, resFail);
    expect(resFail.status).toHaveBeenCalledWith(500);
    expect(resFail.json).toHaveBeenCalledWith({
      error: 'Database error',
      message: 'Unknown error',
    });
  });
});

describe('TC-SCTRL-012 healthCheck', () => {
  it('returns healthy response on success and unhealthy response on failure', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{ now: '2026-04-08T10:30:00.000Z' }],
      })
      .mockRejectedValueOnce(new Error('db down'));

    const req = {} as any;

    const resHealthy = createMockResponse();
    await healthCheck(req, resHealthy);
    expect(resHealthy.json).toHaveBeenCalledWith({
      status: 'healthy',
      database: 'connected',
      timestamp: '2026-04-08T10:30:00.000Z',
    });

    const resUnhealthy = createMockResponse();
    await healthCheck(req, resUnhealthy);
    expect(resUnhealthy.status).toHaveBeenCalledWith(500);
    expect(resUnhealthy.json).toHaveBeenCalledWith({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'db down',
    });
  });
});

describe('TC-SCTRL-013 addSlimeXpDev', () => {
  it('returns 400 with error message when add XP service throws Error', async () => {
    const req = { body: { amount: 75 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const addXpMock = jest.spyOn(slimeDevService, 'addSlimeXpDevForUser') as unknown as jest.Mock;
    addXpMock.mockRejectedValue(new Error('xp service failed'));

    await addSlimeXpDev(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'xp service failed',
    });
  });
});

describe('TC-SCTRL-014 resetSlimeXpDev', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = {} as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const resetXpMock = jest.spyOn(slimeDevService, 'resetSlimeXpDevForUser') as unknown as jest.Mock;

    await resetSlimeXpDev(req, res);

    expect(resetXpMock).not.toHaveBeenCalled();
  });
});

describe('TC-SCTRL-015 resetSlimeXpDev', () => {
  it('returns 400 with error message when XP reset throws Error', async () => {
    const req = {} as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const resetXpMock = jest.spyOn(slimeDevService, 'resetSlimeXpDevForUser') as unknown as jest.Mock;
    resetXpMock.mockRejectedValue(new Error('reset xp failed'));

    await resetSlimeXpDev(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'reset xp failed',
    });
  });
});

describe('TC-SCTRL-016 resetSlimeAchievementsDev', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = {} as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const resetAchievementMock = jest.spyOn(slimeDevService, 'resetSlimeAchievementsDevForUser') as unknown as jest.Mock;

    await resetSlimeAchievementsDev(req, res);

    expect(resetAchievementMock).not.toHaveBeenCalled();
  });
});

describe('TC-SCTRL-017 resetSlimeAchievementsDev', () => {
  it('returns 400 with error message when achievement reset throws Error', async () => {
    const req = {} as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const resetAchievementMock = jest.spyOn(slimeDevService, 'resetSlimeAchievementsDevForUser') as unknown as jest.Mock;
    resetAchievementMock.mockRejectedValue(new Error('reset achievements failed'));

    await resetSlimeAchievementsDev(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'reset achievements failed',
    });
  });
});

describe('TC-SCTRL-018 createTestUser and healthCheck', () => {
  it('maps Error and non-Error failures to expected 500 payload messages', async () => {
    const createUserMock = jest.spyOn(slimeDevService, 'createOrGetTestUserWithSlime') as unknown as jest.Mock;
    createUserMock.mockRejectedValue(new Error('create failed'));

    const req = {} as any;
    const resCreateFail = createMockResponse();
    await createTestUser(req, resCreateFail);
    expect(resCreateFail.status).toHaveBeenCalledWith(500);
    expect(resCreateFail.json).toHaveBeenCalledWith({
      error: 'Database error',
      message: 'create failed',
    });

    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockRejectedValue('db unknown');

    const resHealthFail = createMockResponse();
    await healthCheck(req, resHealthFail);
    expect(resHealthFail.status).toHaveBeenCalledWith(500);
    expect(resHealthFail.json).toHaveBeenCalledWith({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Unknown error',
    });
  });
});
