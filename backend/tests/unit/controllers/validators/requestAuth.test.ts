import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../../src/types/auth.js';
import {
  getAuthenticatedUserId,
  requireAuthenticatedUserId,
} from '../../../../src/controllers/validators/requestAuth.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

describe('TC-RAUTH-001 getAuthenticatedUserId', () => {
  it('returns authenticated user id when request.user.id exists', () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;

    const result = getAuthenticatedUserId(req);

    expect(result).toBe(7);
  });
});

describe('TC-RAUTH-002 requireAuthenticatedUserId', () => {
  it('returns 401 with default message when authenticated user id is missing', () => {
    const req = {
      user: undefined,
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const result = requireAuthenticatedUserId(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-RAUTH-003 requireAuthenticatedUserId', () => {
  it('returns authenticated user id and does not write 401 response when user is present', () => {
    const req = {
      user: { id: 12, email: 'qa@example.com', username: 'qa' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const result = requireAuthenticatedUserId(req, res);

    expect(result).toBe(12);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
