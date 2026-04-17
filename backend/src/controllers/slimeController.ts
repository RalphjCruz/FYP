import { Request, Response } from 'express';
import { env } from '../config/env.js';
import pool from '../config/database.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import {
  addSlimeXpDevForUser,
  createOrGetTestUserWithSlime,
  resetSlimeAchievementsDevForUser,
  resetSlimeXpDevForUser,
} from '../services/slimeDevService.js';
import { buildSlimeStatsPayload, SlimeProfileServiceError } from '../services/slimeProfileService.js';
import { parseInteger, sanitizeText } from '../utils/inputSanitizer.js';
import { getAuthenticatedUserId, requireAuthenticatedUserId } from './validators/requestAuth.js';
import { parseSimulatedDayOffset, parseUserId, resolveSimulatedNowUtc } from './validators/slimeRequestValidators.js';

// Get slime stats for a user
export const getSlimeStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const routeUserId = parseUserId(req.params.userId);
    const userId = authenticatedUserId ?? routeUserId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
      });
    }

    if (authenticatedUserId !== null && routeUserId !== null && routeUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: user mismatch',
      });
    }

    const simulatedDayOffset = parseSimulatedDayOffset(req.query.simulatedDayOffset);
    const simulatedNowUtc = resolveSimulatedNowUtc(simulatedDayOffset, env.nodeEnv);
    const slimeStats = await buildSlimeStatsPayload({
      userId,
      simulatedNowUtc,
    });

    res.json({
      success: true,
      data: slimeStats,
    });
  } catch (error) {
    if (error instanceof SlimeProfileServiceError && error.code === 'SLIME_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Slime not found',
        message: error.message,
      });
    }

    console.error('Error fetching slime:', error);
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const addSlimeXpDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const xpAmount = parseInteger(req.body.amount, 50);
    const xpToAdd = Number.isInteger(xpAmount) && xpAmount > 0 ? xpAmount : 50;
    const payload = await addSlimeXpDevForUser(userId, xpToAdd);

    return res.json({
      success: true,
      message: `Added ${xpToAdd} XP`,
      data: payload,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add XP',
    });
  }
};

export const resetSlimeXpDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const levelSnapshot = await resetSlimeXpDevForUser(userId);

    return res.json({
      success: true,
      message: 'Slime XP reset to zero',
      data: levelSnapshot,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset slime XP',
    });
  }
};

export const resetSlimeAchievementsDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const result = await resetSlimeAchievementsDevForUser(userId);

    return res.json({
      success: true,
      message: 'Achievements reset',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset achievements',
    });
  }
};

export const updateSlimeName = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const nextName = sanitizeText(req.body?.name, {
      trim: true,
      collapseWhitespace: true,
      maxLength: 64,
    });

    if (nextName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Slime name must be at least 2 characters long.',
      });
    }

    const updateResult = await pool.query<{ id: number }>(
      `UPDATE slimes
       SET name = $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING id`,
      [nextName, userId],
    );

    if (!updateResult.rowCount) {
      return res.status(404).json({
        success: false,
        message: 'Slime not found for this user.',
      });
    }

    const updatedPayload = await buildSlimeStatsPayload({ userId });

    return res.json({
      success: true,
      message: 'Slime name updated successfully.',
      data: updatedPayload,
    });
  } catch (error) {
    console.error('Error updating slime name:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update slime name.',
    });
  }
};

// Create a test user with slime
export const createTestUser = async (req: Request, res: Response) => {
  try {
    const result = await createOrGetTestUserWithSlime();
    const wasCreated = result.userCreated || result.slimeCreated;

    return res.json({
      success: true,
      message: wasCreated ? 'Test user and slime created!' : 'Test user and slime already exist.',
      data: {
        user: result.user,
        slime: result.slime,
      },
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
