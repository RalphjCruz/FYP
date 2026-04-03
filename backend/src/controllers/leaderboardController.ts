import type { Response } from 'express';
import { getGlobalLeaderboard } from '../services/leaderboardService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { parseInteger } from '../utils/inputSanitizer.js';
import { requireAuthenticatedUserId } from './validators/requestAuth.js';

export const getGlobalLeaderboardController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const limit = parseInteger(req.query.limit, 20);
    const data = await getGlobalLeaderboard(limit);

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch global leaderboard',
    });
  }
};
