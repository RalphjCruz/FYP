import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import {
  completeFocusSessionController,
  resetFocusProgressDevController,
  settleFocusDayDevController,
  startFocusSessionDraftController,
  updateFocusProfileController,
} from '../../../src/controllers/focusController.js';
import * as requestAuthValidators from '../../../src/controllers/validators/requestAuth.js';
import * as studyHealthService from '../../../src/services/studyHealthService.js';
import * as inputSanitizer from '../../../src/utils/inputSanitizer.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-FCTRL-001 completeFocusSessionController', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: { draftId: 30 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const recordMock = jest.spyOn(studyHealthService, 'recordFocusSessionCompletion') as unknown as jest.Mock;

    await completeFocusSessionController(req, res);

    expect(recordMock).not.toHaveBeenCalled();
  });
});

describe('TC-FCTRL-002 completeFocusSessionController', () => {
  it('returns 400 when draftId is not a positive integer', async () => {
    const req = { body: { draftId: 0 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    await completeFocusSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'draftId must be a positive integer',
    });
  });
});

describe('TC-FCTRL-003 completeFocusSessionController', () => {
  it('returns 400 when draftId is malformed', async () => {
    const req = {
      body: {
        draftId: 'not-a-number',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    await completeFocusSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'draftId must be a positive integer',
    });
  });
});

describe('TC-FCTRL-004 completeFocusSessionController', () => {
  it('passes draft id and optional timezone and returns success payload', async () => {
    const req = {
      body: {
        draftId: 44,
        timezoneIana: ' Europe/Dublin ',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const recordMock = jest.spyOn(studyHealthService, 'recordFocusSessionCompletion') as unknown as jest.Mock;
    recordMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 1,
      dailyGoalMinutes: 180,
      todayFocusedMinutes: 720,
      timezoneIana: 'Europe/Dublin',
      lastSettledOnLocal: '2026-04-08',
      hpDeltaCarry: 0,
      level: 1,
      levelReduced: false,
    });

    await completeFocusSessionController(req, res);

    expect(recordMock).toHaveBeenCalledWith(
      7,
      {
        draftId: 44,
        timezoneIana: 'Europe/Dublin',
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Focus session recorded',
      data: {
        currentHp: 100,
        maxHp: 100,
        dayStreak: 1,
        dailyGoalMinutes: 180,
        todayFocusedMinutes: 720,
        timezoneIana: 'Europe/Dublin',
        lastSettledOnLocal: '2026-04-08',
        hpDeltaCarry: 0,
        level: 1,
        levelReduced: false,
      },
    });
  });
});

describe('TC-FCTRL-005 updateFocusProfileController', () => {
  it('returns 400 when targetDailyMinutes is provided but not an integer', async () => {
    const req = { body: { targetDailyMinutes: 'abc' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    await updateFocusProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'targetDailyMinutes must be an integer',
    });
  });
});

describe('TC-FCTRL-006 settleFocusDayDevController', () => {
  it('clamps dayOffset, optionally updates timezone, and returns simulated settlement payload', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-08T00:00:00.000Z').getTime());
    const req = {
      body: {
        dayOffset: 999,
        timezoneIana: 'UTC',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    updateMock.mockResolvedValue({
      currentHp: 100,
      maxHp: 100,
      dayStreak: 1,
      dailyGoalMinutes: 180,
      todayFocusedMinutes: 0,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-08',
      hpDeltaCarry: 0,
      level: 1,
      levelReduced: false,
    });

    const snapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    snapshotMock.mockResolvedValue({
      currentHp: 95,
      maxHp: 100,
      dayStreak: 2,
      dailyGoalMinutes: 180,
      todayFocusedMinutes: 50,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2027-04-08',
      hpDeltaCarry: 0.2,
      level: 2,
      levelReduced: false,
    });

    await settleFocusDayDevController(req, res);

    expect(updateMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        timezoneIana: 'UTC',
      }),
    );
    expect(snapshotMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        nowUtc: expect.any(Date),
      }),
    );

    const simulatedNow = (snapshotMock.mock.calls[0][1].nowUtc as Date).toISOString();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Settlement simulated for day offset 365',
      data: {
        currentHp: 95,
        maxHp: 100,
        dayStreak: 2,
        dailyGoalMinutes: 180,
        todayFocusedMinutes: 50,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2027-04-08',
        hpDeltaCarry: 0.2,
        level: 2,
        levelReduced: false,
        simulatedNowUtc: simulatedNow,
        dayOffset: 365,
      },
    });

    nowSpy.mockRestore();
  });
});

describe('TC-FCTRL-007 completeFocusSessionController', () => {
  it('returns 400 with service error message when focus completion throws Error', async () => {
    const req = { body: { draftId: 25 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const recordMock = jest.spyOn(studyHealthService, 'recordFocusSessionCompletion') as unknown as jest.Mock;
    recordMock.mockRejectedValue(new Error('record failed'));

    await completeFocusSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'record failed',
    });
  });
});

describe('TC-FCTRL-008 updateFocusProfileController', () => {
  it('returns 400 when studyStyle is provided but invalid', async () => {
    const req = {
      body: {
        targetDailyMinutes: 180,
        studyStyle: 'invalid_style',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);

    await updateFocusProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'studyStyle must be deep_focus, balanced, or sprint',
    });
  });
});

describe('TC-FCTRL-009 updateFocusProfileController', () => {
  it('returns 400 when preferredSessionIntensity is provided but not integer', async () => {
    const req = {
      body: {
        targetDailyMinutes: 180,
        preferredSessionIntensity: 'fast',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);

    await updateFocusProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'preferredSessionIntensity must be an integer',
    });
  });
});

describe('TC-FCTRL-010 updateFocusProfileController', () => {
  it('returns 400 when distractionLevel is provided but invalid', async () => {
    const req = {
      body: {
        targetDailyMinutes: 180,
        distractionLevel: 'extreme',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);

    await updateFocusProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'distractionLevel must be low, medium, or high',
    });
  });
});

describe('TC-FCTRL-011 updateFocusProfileController', () => {
  it('clamps profile values on success and returns fallback message for non-Error failure', async () => {
    const req = {
      body: {
        targetDailyMinutes: 999,
        studyStyle: 'deep_focus',
        preferredSessionIntensity: 99,
        distractionLevel: 'low',
        timezoneIana: 'UTC',
      },
    } as unknown as AuthenticatedRequest;

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);

    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    updateMock
      .mockResolvedValueOnce({
        currentHp: 100,
        maxHp: 100,
        dayStreak: 2,
        dailyGoalMinutes: 720,
        todayFocusedMinutes: 50,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-08',
        hpDeltaCarry: 0,
        level: 1,
        levelReduced: false,
      })
      .mockRejectedValueOnce('update failed');

    const resSuccess = createMockResponse();
    await updateFocusProfileController(req, resSuccess);
    expect(updateMock).toHaveBeenCalledWith(7, {
      targetDailyMinutes: 720,
      studyStyle: 'deep_focus',
      preferredSessionIntensity: 5,
      distractionLevel: 'low',
      timezoneIana: 'UTC',
    });
    expect(resSuccess.json).toHaveBeenCalledWith({
      success: true,
      message: 'Focus profile updated',
      data: {
        currentHp: 100,
        maxHp: 100,
        dayStreak: 2,
        dailyGoalMinutes: 720,
        todayFocusedMinutes: 50,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-08',
        hpDeltaCarry: 0,
        level: 1,
        levelReduced: false,
      },
    });

    const resFailure = createMockResponse();
    await updateFocusProfileController(req, resFailure);
    expect(resFailure.status).toHaveBeenCalledWith(400);
    expect(resFailure.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to update focus profile',
    });
  });
});

describe('TC-FCTRL-012 settleFocusDayDevController and resetFocusProgressDevController', () => {
  it('covers invalid/catch paths for settlement and success/catch paths for reset', async () => {
    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(7);

    const invalidReq = { body: { dayOffset: 'abc' } } as unknown as AuthenticatedRequest;
    const invalidRes = createMockResponse();
    const parseIntegerSpy = jest.spyOn(inputSanitizer, 'parseInteger');
    parseIntegerSpy.mockReturnValueOnce(Number.NaN);
    await settleFocusDayDevController(invalidReq, invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);
    expect(invalidRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'dayOffset must be an integer',
    });

    const settleReq = { body: { dayOffset: 1 } } as unknown as AuthenticatedRequest;
    const settleRes = createMockResponse();
    const snapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    snapshotMock.mockRejectedValueOnce(new Error('settlement failed'));
    await settleFocusDayDevController(settleReq, settleRes);
    expect(settleRes.status).toHaveBeenCalledWith(400);
    expect(settleRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'settlement failed',
    });

    const resetMock = jest.spyOn(studyHealthService, 'resetStudyProgressDev') as unknown as jest.Mock;
    resetMock
      .mockResolvedValueOnce({
        currentHp: 100,
        maxHp: 100,
        dayStreak: 0,
        dailyGoalMinutes: 180,
        todayFocusedMinutes: 0,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-08',
        hpDeltaCarry: 0,
        level: 1,
        levelReduced: false,
      })
      .mockRejectedValueOnce('reset failed');

    const resetReq = { body: {} } as unknown as AuthenticatedRequest;

    requireAuthMock.mockReturnValueOnce(null);
    const resetResMissing = createMockResponse();
    await resetFocusProgressDevController(resetReq, resetResMissing);
    expect(resetMock).not.toHaveBeenCalled();

    const resetResSuccess = createMockResponse();
    await resetFocusProgressDevController(resetReq, resetResSuccess);
    expect(resetResSuccess.json).toHaveBeenCalledWith({
      success: true,
      message: 'Focus progress reset',
      data: {
        currentHp: 100,
        maxHp: 100,
        dayStreak: 0,
        dailyGoalMinutes: 180,
        todayFocusedMinutes: 0,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-08',
        hpDeltaCarry: 0,
        level: 1,
        levelReduced: false,
      },
    });

    const resetResFail = createMockResponse();
    await resetFocusProgressDevController(resetReq, resetResFail);
    expect(resetResFail.status).toHaveBeenCalledWith(400);
    expect(resetResFail.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to reset focus progress',
    });
  });
});

describe('TC-FCTRL-013 completeFocusSessionController', () => {
  it('returns 400 fallback message when focus completion throws non-Error value', async () => {
    const req = { body: { draftId: 25 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const recordMock = jest.spyOn(studyHealthService, 'recordFocusSessionCompletion') as unknown as jest.Mock;
    recordMock.mockRejectedValue('failed');

    await completeFocusSessionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to record focus session',
    });
  });
});

describe('TC-FCTRL-014 updateFocusProfileController', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;

    await updateFocusProfileController(req, res);

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('TC-FCTRL-015 updateFocusProfileController', () => {
  it('returns 400 with error message when profile update throws Error', async () => {
    const req = { body: { targetDailyMinutes: 180 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    updateMock.mockRejectedValue(new Error('profile update failed'));

    await updateFocusProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'profile update failed',
    });
  });
});

describe('TC-FCTRL-016 settleFocusDayDevController', () => {
  it('returns 400 fallback message when settlement throws non-Error value', async () => {
    const req = { body: { dayOffset: 1 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);

    const snapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    snapshotMock.mockRejectedValue('settlement failed');

    await settleFocusDayDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to simulate settlement',
    });
  });
});

describe('TC-FCTRL-017 resetFocusProgressDevController', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const requireAuthMock = jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId');
    requireAuthMock.mockReturnValue(null);

    const resetMock = jest.spyOn(studyHealthService, 'resetStudyProgressDev') as unknown as jest.Mock;

    await resetFocusProgressDevController(req, res);

    expect(resetMock).not.toHaveBeenCalled();
  });
});

describe('TC-FCTRL-018 resetFocusProgressDevController', () => {
  it('returns 400 with error message when reset throws Error', async () => {
    const req = { body: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const resetMock = jest.spyOn(studyHealthService, 'resetStudyProgressDev') as unknown as jest.Mock;
    resetMock.mockRejectedValue(new Error('reset error'));

    await resetFocusProgressDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'reset error',
    });
  });
});

describe('TC-FCTRL-019 updateFocusProfileController', () => {
  it('passes undefined targetDailyMinutes when field is omitted and returns success payload', async () => {
    const req = {
      body: {
        studyStyle: 'balanced',
        preferredSessionIntensity: 3,
        distractionLevel: 'medium',
        timezoneIana: 'UTC',
      },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    updateMock.mockResolvedValue({
      currentHp: 98,
      maxHp: 100,
      dayStreak: 3,
      dailyGoalMinutes: 180,
      todayFocusedMinutes: 45,
      timezoneIana: 'UTC',
      lastSettledOnLocal: '2026-04-09',
      hpDeltaCarry: 0,
      level: 2,
      levelReduced: false,
    });

    await updateFocusProfileController(req, res);

    expect(updateMock).toHaveBeenCalledWith(7, {
      targetDailyMinutes: undefined,
      studyStyle: 'balanced',
      preferredSessionIntensity: 3,
      distractionLevel: 'medium',
      timezoneIana: 'UTC',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Focus profile updated',
      data: {
        currentHp: 98,
        maxHp: 100,
        dayStreak: 3,
        dailyGoalMinutes: 180,
        todayFocusedMinutes: 45,
        timezoneIana: 'UTC',
        lastSettledOnLocal: '2026-04-09',
        hpDeltaCarry: 0,
        level: 2,
        levelReduced: false,
      },
    });
  });
});

describe('TC-FCTRL-020 settleFocusDayDevController', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: { dayOffset: 1 } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(null);
    const snapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    const updateMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;

    await settleFocusDayDevController(req, res);

    expect(snapshotMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('TC-FCTRL-021 startFocusSessionDraftController', () => {
  it('returns early when authenticated user id is missing', async () => {
    const req = { body: { timezoneIana: 'UTC' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(null);
    const startMock = jest.spyOn(studyHealthService, 'startFocusSessionDraft') as unknown as jest.Mock;

    await startFocusSessionDraftController(req, res);

    expect(startMock).not.toHaveBeenCalled();
  });
});

describe('TC-FCTRL-022 startFocusSessionDraftController', () => {
  it('starts draft and returns success payload', async () => {
    const req = { body: { timezoneIana: ' Europe/Dublin ' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const startMock = jest.spyOn(studyHealthService, 'startFocusSessionDraft') as unknown as jest.Mock;
    startMock.mockResolvedValue({
      draftId: 1001,
      status: 'active',
      startedAtUtc: '2026-04-13T19:45:00.000Z',
      timezoneIana: 'Europe/Dublin',
      localDayKey: '2026-04-13',
    });

    await startFocusSessionDraftController(req, res);

    expect(startMock).toHaveBeenCalledWith(7, { timezoneIana: 'Europe/Dublin' });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Focus draft started',
      data: {
        draftId: 1001,
        status: 'active',
        startedAtUtc: '2026-04-13T19:45:00.000Z',
        timezoneIana: 'Europe/Dublin',
        localDayKey: '2026-04-13',
      },
    });
  });
});

describe('TC-FCTRL-023 startFocusSessionDraftController', () => {
  it('returns 400 with service error message when draft start throws Error', async () => {
    const req = { body: { timezoneIana: 'UTC' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const startMock = jest.spyOn(studyHealthService, 'startFocusSessionDraft') as unknown as jest.Mock;
    startMock.mockRejectedValue(new Error('start draft failed'));

    await startFocusSessionDraftController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'start draft failed',
    });
  });
});

describe('TC-FCTRL-024 startFocusSessionDraftController', () => {
  it('returns 400 fallback message when draft start throws non-Error', async () => {
    const req = { body: { timezoneIana: 'UTC' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    jest.spyOn(requestAuthValidators, 'requireAuthenticatedUserId').mockReturnValue(7);
    const startMock = jest.spyOn(studyHealthService, 'startFocusSessionDraft') as unknown as jest.Mock;
    startMock.mockRejectedValue('draft failed');

    await startFocusSessionDraftController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to start focus draft',
    });
  });
});
