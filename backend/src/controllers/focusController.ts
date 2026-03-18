import type { Response } from 'express';
import {
  getStudyHealthSnapshot,
  recordFocusSessionCompletion,
  resetStudyProgressDev,
  updateStudyProfile,
} from '../services/studyHealthService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { clampNumber, parseInteger, sanitizeText } from '../utils/inputSanitizer.js';

const getAuthenticatedUserId = (req: AuthenticatedRequest): number | null => req.user?.id ?? null;

const parseOptionalUtcDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 80 });
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseOptionalTimezone = (value: unknown): string | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 64 });
  return sanitized || undefined;
};

const parseOptionalStudyStyle = (value: unknown): 'deep_focus' | 'balanced' | 'sprint' | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 32 });
  if (!sanitized) {
    return undefined;
  }

  if (sanitized === 'deep_focus' || sanitized === 'balanced' || sanitized === 'sprint') {
    return sanitized;
  }

  return undefined;
};

const parseOptionalDistractionLevel = (value: unknown): 'low' | 'medium' | 'high' | undefined => {
  const sanitized = sanitizeText(value, { trim: true, collapseWhitespace: true, maxLength: 16 });
  if (!sanitized) {
    return undefined;
  }

  if (sanitized === 'low' || sanitized === 'medium' || sanitized === 'high') {
    return sanitized;
  }

  return undefined;
};

export const completeFocusSessionController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const durationMinutes = parseInteger(req.body.durationMinutes, 0);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'durationMinutes must be a positive integer' });
    }

    const parsedCompletedAtUtc = parseOptionalUtcDate(req.body.completedAtUtc);
    if (typeof req.body.completedAtUtc !== 'undefined' && !parsedCompletedAtUtc) {
      return res.status(400).json({ success: false, message: 'completedAtUtc must be a valid ISO datetime string' });
    }
    const completedAtUtc = parsedCompletedAtUtc ?? undefined;
    const timezoneIana = parseOptionalTimezone(req.body.timezoneIana);

    const data = await recordFocusSessionCompletion(userId, {
      durationMinutes: clampNumber(durationMinutes, 1, 720),
      completedAtUtc,
      timezoneIana,
    });

    return res.json({
      success: true,
      message: 'Focus session recorded',
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record focus session',
    });
  }
};

export const updateFocusProfileController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const parsedTargetDailyMinutes = parseInteger(req.body.targetDailyMinutes, Number.NaN);
    if (typeof req.body.targetDailyMinutes !== 'undefined' && !Number.isInteger(parsedTargetDailyMinutes)) {
      return res.status(400).json({ success: false, message: 'targetDailyMinutes must be an integer' });
    }
    const targetDailyMinutes = Number.isInteger(parsedTargetDailyMinutes)
      ? clampNumber(parsedTargetDailyMinutes, 30, 720)
      : undefined;

    const studyStyle = parseOptionalStudyStyle(req.body.studyStyle);
    if (typeof req.body.studyStyle !== 'undefined' && !studyStyle) {
      return res.status(400).json({ success: false, message: 'studyStyle must be deep_focus, balanced, or sprint' });
    }

    const preferredSessionIntensityRaw = parseInteger(req.body.preferredSessionIntensity, Number.NaN);
    if (typeof req.body.preferredSessionIntensity !== 'undefined' && !Number.isInteger(preferredSessionIntensityRaw)) {
      return res.status(400).json({ success: false, message: 'preferredSessionIntensity must be an integer' });
    }
    const preferredSessionIntensity = Number.isInteger(preferredSessionIntensityRaw)
      ? clampNumber(preferredSessionIntensityRaw, 1, 5)
      : undefined;

    const distractionLevel = parseOptionalDistractionLevel(req.body.distractionLevel);
    if (typeof req.body.distractionLevel !== 'undefined' && !distractionLevel) {
      return res.status(400).json({ success: false, message: 'distractionLevel must be low, medium, or high' });
    }
    const timezoneIana = parseOptionalTimezone(req.body.timezoneIana);

    const data = await updateStudyProfile(userId, {
      targetDailyMinutes,
      studyStyle,
      preferredSessionIntensity,
      distractionLevel,
      timezoneIana,
    });

    return res.json({
      success: true,
      message: 'Focus profile updated',
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update focus profile',
    });
  }
};

export const settleFocusDayDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const dayOffsetRaw = parseInteger(req.body.dayOffset, 0);
    if (!Number.isInteger(dayOffsetRaw)) {
      return res.status(400).json({ success: false, message: 'dayOffset must be an integer' });
    }
    const dayOffset = clampNumber(dayOffsetRaw, -365, 365);

    const timezoneIana = parseOptionalTimezone(req.body.timezoneIana);
    if (timezoneIana) {
      await updateStudyProfile(userId, { timezoneIana });
    }

    const simulatedNowUtc = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const snapshot = await getStudyHealthSnapshot(userId, { nowUtc: simulatedNowUtc });

    return res.json({
      success: true,
      message: `Settlement simulated for day offset ${dayOffset}`,
      data: {
        ...snapshot,
        simulatedNowUtc: simulatedNowUtc.toISOString(),
        dayOffset,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to simulate settlement',
    });
  }
};

export const resetFocusProgressDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await resetStudyProgressDev(userId);
    return res.json({
      success: true,
      message: 'Focus progress reset',
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset focus progress',
    });
  }
};
