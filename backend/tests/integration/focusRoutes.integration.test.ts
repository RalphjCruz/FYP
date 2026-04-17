import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authAccountService from '../../src/services/authAccountService.js';
import * as studyHealthService from '../../src/services/studyHealthService.js';

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

describe('TC-FOCUSINT-001 POST /api/focus/sessions/start', () => {
  it('returns 401 when authentication token is missing', async () => {
    const response = await request(app).post('/api/focus/sessions/start').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing authentication token',
    });
  });
});

describe('TC-FOCUSINT-002 POST /api/focus/sessions/complete', () => {
  it('returns 401 when authentication token is invalid', async () => {
    const response = await request(app)
      .post('/api/focus/sessions/complete')
      .set('Authorization', 'Bearer invalid.token.value')
      .send({ draftId: 1 });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid or expired token',
    });
  });
});

describe('TC-FOCUSINT-003 POST /api/focus/sessions/start', () => {
  it('starts focus draft and forwards timezone input', async () => {
    const startDraftMock = jest.spyOn(studyHealthService, 'startFocusSessionDraft') as unknown as jest.Mock;
    startDraftMock.mockResolvedValue({
      draftId: 42,
      status: 'active',
      startedAtUtc: '2026-04-01T09:00:00.000Z',
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/sessions/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ timezoneIana: 'Europe/Dublin' });

    expect(response.status).toBe(200);
    expect(startDraftMock).toHaveBeenCalledWith(7, { timezoneIana: 'Europe/Dublin' });
    expect(response.body).toEqual({
      success: true,
      message: 'Focus draft started',
      data: {
        draftId: 42,
        status: 'active',
        startedAtUtc: '2026-04-01T09:00:00.000Z',
      },
    });
  });
});

describe('TC-FOCUSINT-004 POST /api/focus/sessions/complete', () => {
  it('returns 400 when draftId is not a positive integer', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/sessions/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ draftId: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'draftId must be a positive integer',
    });
  });
});

describe('TC-FOCUSINT-005 POST /api/focus/sessions/complete', () => {
  it('records focus session for valid payload', async () => {
    const completeFocusMock = jest.spyOn(studyHealthService, 'recordFocusSessionCompletion') as unknown as jest.Mock;
    completeFocusMock.mockResolvedValue({
      session: { durationMinutes: 25 },
      studyHealth: { hp: { current: 95, max: 100 } },
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/sessions/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ draftId: 5, timezoneIana: 'Europe/Dublin' });

    expect(response.status).toBe(200);
    expect(completeFocusMock).toHaveBeenCalledWith(7, {
      draftId: 5,
      timezoneIana: 'Europe/Dublin',
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Focus session recorded',
      data: {
        session: { durationMinutes: 25 },
        studyHealth: { hp: { current: 95, max: 100 } },
      },
    });
  });
});

describe('TC-FOCUSINT-006 PUT /api/focus/profile', () => {
  it('returns 400 when studyStyle is invalid', async () => {
    const token = createAuthToken(7);
    const response = await request(app)
      .put('/api/focus/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ studyStyle: 'invalid-style' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'studyStyle must be deep_focus, balanced, or sprint',
    });
  });
});

describe('TC-FOCUSINT-007 PUT /api/focus/profile', () => {
  it('clamps profile values and forwards normalized payload to service', async () => {
    const updateProfileMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    updateProfileMock.mockResolvedValue({
      profile: {
        targetDailyMinutes: 720,
        preferredSessionIntensity: 5,
        studyStyle: 'sprint',
        distractionLevel: 'high',
      },
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .put('/api/focus/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetDailyMinutes: 2000,
        preferredSessionIntensity: 99,
        studyStyle: 'sprint',
        distractionLevel: 'high',
        timezoneIana: 'Europe/Dublin',
      });

    expect(response.status).toBe(200);
    expect(updateProfileMock).toHaveBeenCalledWith(7, {
      targetDailyMinutes: 720,
      studyStyle: 'sprint',
      preferredSessionIntensity: 5,
      distractionLevel: 'high',
      timezoneIana: 'Europe/Dublin',
    });
    expect(response.body).toEqual({
      success: true,
      message: 'Focus profile updated',
      data: {
        profile: {
          targetDailyMinutes: 720,
          preferredSessionIntensity: 5,
          studyStyle: 'sprint',
          distractionLevel: 'high',
        },
      },
    });
  });
});

describe('TC-FOCUSINT-008 POST /api/focus/dev/settle', () => {
  it('returns simulated settlement payload with dayOffset metadata', async () => {
    const updateProfileMock = jest.spyOn(studyHealthService, 'updateStudyProfile') as unknown as jest.Mock;
    const snapshotMock = jest.spyOn(studyHealthService, 'getStudyHealthSnapshot') as unknown as jest.Mock;
    updateProfileMock.mockResolvedValue({
      profile: { timezoneIana: 'Europe/Dublin' },
    });
    snapshotMock.mockResolvedValue({
      hp: { current: 94, max: 100 },
      streak: { dayStreak: 3 },
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/dev/settle')
      .set('Authorization', `Bearer ${token}`)
      .send({ dayOffset: 2, timezoneIana: 'Europe/Dublin' });

    expect(response.status).toBe(200);
    expect(updateProfileMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        timezoneIana: 'Europe/Dublin',
        nowUtc: expect.any(Date),
      }),
    );
    expect(snapshotMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        nowUtc: expect.any(Date),
      }),
    );
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Settlement simulated for day offset 2');
    expect(response.body.data.dayOffset).toBe(2);
    expect(typeof response.body.data.simulatedNowUtc).toBe('string');
  });
});

describe('TC-FOCUSINT-009 POST /api/focus/dev/reset-progress', () => {
  it('returns reset payload for authenticated user', async () => {
    const resetProgressMock = jest.spyOn(studyHealthService, 'resetStudyProgressDev') as unknown as jest.Mock;
    resetProgressMock.mockResolvedValue({
      hp: { current: 100, max: 100 },
      streak: { dayStreak: 0 },
    });

    const token = createAuthToken(7);
    const response = await request(app)
      .post('/api/focus/dev/reset-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(resetProgressMock).toHaveBeenCalledWith(7);
    expect(response.body).toEqual({
      success: true,
      message: 'Focus progress reset',
      data: {
        hp: { current: 100, max: 100 },
        streak: { dayStreak: 0 },
      },
    });
  });
});

