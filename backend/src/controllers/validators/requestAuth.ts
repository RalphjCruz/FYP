import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../types/auth.js';

export const getAuthenticatedUserId = (req: AuthenticatedRequest): number | null => req.user?.id ?? null;

export const requireAuthenticatedUserId = (
  req: AuthenticatedRequest,
  res: Response,
  missingMessage = 'Missing authenticated user',
): number | null => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, message: missingMessage });
    return null;
  }

  return userId;
};
