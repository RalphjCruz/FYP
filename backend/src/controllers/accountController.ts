import type { Response } from 'express';
import { env } from '../config/env.js';
import { getClientIp } from '../services/authSecurityService.js';
import {
  cancelAccountDeletion,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '../services/accountDeletionService.js';
import { AccountServiceError, buildAccountDataExport } from '../services/accountService.js';
import { logOperationalAuditEvent } from '../services/operationalAuditLogService.js';
import { buildProtectedRouteRateLimitKey, consumeRateLimit } from '../services/requestRateLimitService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { requireAuthenticatedUserId } from './validators/requestAuth.js';

const ACCOUNT_EXPORT_ROUTE_KEY = 'account.export';

const safeLogOperationalAuditEvent = async (event: Parameters<typeof logOperationalAuditEvent>[0]) => {
  try {
    await logOperationalAuditEvent(event);
  } catch (error) {
    console.error('Failed to write operational audit event:', error);
  }
};

export const exportAccountDataController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const clientIp = getClientIp(req.ip, req.headers['x-forwarded-for']);
    const rateLimitKey = buildProtectedRouteRateLimitKey({
      ipAddress: clientIp,
      userId,
      routeId: ACCOUNT_EXPORT_ROUTE_KEY,
      secret: env.rateLimitSecret,
    });
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
    await safeLogOperationalAuditEvent({
      eventType: 'account_export_requested',
      actorUserId: userId,
      metadata: { routeKey: ACCOUNT_EXPORT_ROUTE_KEY },
    });

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

export const getAccountDeletionStatusController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const status = await getAccountDeletionStatus(userId);
    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to read account deletion status',
    });
  }
};

export const requestAccountDeletionController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const clientIp = getClientIp(req.ip, req.headers['x-forwarded-for']);
    const result = await requestAccountDeletion(userId, clientIp);
    await safeLogOperationalAuditEvent({
      eventType: 'account_deletion_requested',
      actorUserId: userId,
      metadata: {
        requestedIp: clientIp,
        idempotent: result.idempotent,
        scheduledPurgeAt: result.scheduledPurgeAt,
      },
    });

    return res.json({
      success: true,
      data: result,
      message: result.idempotent
        ? 'Account deletion request already pending'
        : 'Account deletion requested successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request account deletion',
    });
  }
};

export const cancelAccountDeletionController = async (req: AuthenticatedRequest, res: Response) => {
  const userId = requireAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const result = await cancelAccountDeletion(userId);
    await safeLogOperationalAuditEvent({
      eventType: 'account_deletion_cancelled',
      actorUserId: userId,
      metadata: {
        idempotent: result.idempotent,
        status: result.status,
      },
    });

    return res.json({
      success: true,
      data: result,
      message: result.idempotent
        ? 'No pending deletion request to cancel'
        : 'Account deletion request cancelled',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel account deletion request',
    });
  }
};
