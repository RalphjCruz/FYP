import type { Response } from 'express';
import { env } from '../config/env.js';
import { getClientIp } from '../services/authSecurityService.js';
import { AccountServiceError, buildAccountDataExport } from '../services/accountService.js';
import { consumeRateLimit, hashRateLimitKey } from '../services/requestRateLimitService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { requireAuthenticatedUserId } from './validators/requestAuth.js';

const ACCOUNT_EXPORT_ROUTE_KEY = 'account.export';

export const exportAccountDataController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const clientIp = getClientIp(req.ip, req.headers['x-forwarded-for']);
    const rateLimitKey = hashRateLimitKey(`${clientIp}:${userId}:${ACCOUNT_EXPORT_ROUTE_KEY}`, env.rateLimitSecret);
    const rateLimit = await consumeRateLimit({
      keyHash: rateLimitKey,
      routeKey: ACCOUNT_EXPORT_ROUTE_KEY,
      limit: env.accountExportRateLimitPerWindow,
      windowSeconds: env.accountExportRateLimitWindowSeconds,
    });

    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: 'Too many export requests. Please try again later.',
      });
    }

    const data = await buildAccountDataExport(userId);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof AccountServiceError && error.code === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export account data',
    });
  }
};

