import type { Request } from 'express';
import type { AuthenticatedRequest } from '../../types/auth.js';
import { parsePositiveInteger } from '../../utils/inputSanitizer.js';

const getParamValue = (value: string | string[] | undefined, fallback = ''): string => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
};

export const AUTH_MISMATCH_USER_ID = -1;

export const getUserIdFromTaskRequest = (req: AuthenticatedRequest): number | null => {
  const authenticatedUserId = req.user?.id ?? null;
  const userIdParam = getParamValue(req.params.userId);
  const routeUserId = parsePositiveInteger(userIdParam);

  if (authenticatedUserId !== null) {
    if (routeUserId !== null && routeUserId !== authenticatedUserId) {
      return AUTH_MISMATCH_USER_ID;
    }

    return authenticatedUserId;
  }

  return routeUserId;
};

export const getTaskIdFromTaskRequest = (req: Request): number | null => {
  const taskIdParam = getParamValue(req.params.taskId);
  return parsePositiveInteger(taskIdParam);
};
