import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../types/auth.js';

type AuthTokenPayload = {
  sub: string;
  email: string;
  username: string;
};

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Missing authentication token',
    });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    const userId = Number.parseInt(decoded.sub, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    (req as AuthenticatedRequest).user = {
      id: userId,
      email: decoded.email,
      username: decoded.username,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
