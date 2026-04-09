import type { Request } from 'express';
import type { AuthenticatedRequest } from '../../../../src/types/auth.js';
import {
  AUTH_MISMATCH_USER_ID,
  getTaskIdFromTaskRequest,
  getUserIdFromTaskRequest,
} from '../../../../src/controllers/validators/taskRequestValidators.js';

describe('TC-TRV-001 getUserIdFromTaskRequest', () => {
  it('returns AUTH_MISMATCH_USER_ID when authenticated user id and route user id differ', () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      params: { userId: '8' },
    } as unknown as AuthenticatedRequest;

    const result = getUserIdFromTaskRequest(req);

    expect(result).toBe(AUTH_MISMATCH_USER_ID);
  });
});

describe('TC-TRV-002 getUserIdFromTaskRequest', () => {
  it('returns authenticated user id when auth context exists and route param is missing', () => {
    const req = {
      user: { id: 11, email: 'student@example.com', username: 'student' },
      params: {},
    } as unknown as AuthenticatedRequest;

    const result = getUserIdFromTaskRequest(req);

    expect(result).toBe(11);
  });
});

describe('TC-TRV-003 task request id parsing', () => {
  it('uses positive route ids when unauthenticated and parses taskId from route params', () => {
    const userReq = {
      user: undefined,
      params: { userId: ['15'] },
    } as unknown as AuthenticatedRequest;
    const taskReq = {
      params: { taskId: ['42'] },
    } as unknown as Request;

    const userId = getUserIdFromTaskRequest(userReq);
    const taskId = getTaskIdFromTaskRequest(taskReq);

    expect(userId).toBe(15);
    expect(taskId).toBe(42);
  });
});

describe('TC-TRV-004 getTaskIdFromTaskRequest', () => {
  it('returns null when taskId param is invalid', () => {
    const req = {
      params: { taskId: 'abc' },
    } as unknown as Request;

    const result = getTaskIdFromTaskRequest(req);

    expect(result).toBeNull();
  });
});

describe('TC-TRV-005 getUserIdFromTaskRequest', () => {
  it('returns authenticated user id when route userId param array is empty', () => {
    const req = {
      user: { id: 22, email: 'student@example.com', username: 'student' },
      params: { userId: [] },
    } as unknown as AuthenticatedRequest;

    const result = getUserIdFromTaskRequest(req);

    expect(result).toBe(22);
  });
});

describe('TC-TRV-006 getUserIdFromTaskRequest', () => {
  it('returns null when request is unauthenticated and route userId is missing', () => {
    const req = {
      user: undefined,
      params: {},
    } as unknown as AuthenticatedRequest;

    const result = getUserIdFromTaskRequest(req);

    expect(result).toBeNull();
  });
});
