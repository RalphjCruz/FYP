import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../../../src/middlewares/authMiddleware.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-MW-001 requireAuth', () => {
  it('bypasses auth checks for OPTIONS requests', () => {
    const req = {
      method: 'OPTIONS',
      header: jest.fn(),
    } as unknown as Request;

    const status = jest.fn();
    const json = jest.fn();
    const res = {
      status,
      json,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});

describe('TC-MW-002 requireAuth', () => {
  it('returns 401 when bearer token is missing', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      status,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authentication token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('TC-MW-003 requireAuth', () => {
  it('returns 401 when authorization scheme is not Bearer', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Basic abc123'),
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      status,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authentication token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('TC-MW-004 requireAuth', () => {
  it('returns 401 when bearer token verification fails', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer invalid-token'),
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      status,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('TC-MW-005 requireAuth', () => {
  it('attaches authenticated user and calls next when bearer token is valid', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer valid-token'),
    } as unknown as Request & { user?: { id: number; email: string; username: string } };

    const status = jest.fn();
    const json = jest.fn();
    const res = {
      status,
      json,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    const verifyMock = jest.spyOn(jwt, 'verify') as unknown as jest.Mock;
    verifyMock.mockReturnValue({
      sub: '12',
      email: 'student@example.com',
      username: 'student',
    });

    requireAuth(req, res, next);

    expect(req.user).toEqual({
      id: 12,
      email: 'student@example.com',
      username: 'student',
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});

describe('TC-MW-006 requireAuth', () => {
  it('returns 401 when decoded token subject is not a valid positive integer', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer valid-token'),
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      status,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    const verifyMock = jest.spyOn(jwt, 'verify') as unknown as jest.Mock;
    verifyMock.mockReturnValue({
      sub: 'not-a-number',
      email: 'student@example.com',
      username: 'student',
    });

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid authentication token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('TC-MW-007 requireAuth', () => {
  it('returns 401 when decoded token subject is zero', () => {
    const req = {
      method: 'GET',
      header: jest.fn().mockReturnValue('Bearer valid-token'),
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      status,
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    const verifyMock = jest.spyOn(jwt, 'verify') as unknown as jest.Mock;
    verifyMock.mockReturnValue({
      sub: '0',
      email: 'student@example.com',
      username: 'student',
    });

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid authentication token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
