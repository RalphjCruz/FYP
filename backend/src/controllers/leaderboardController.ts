import type { Response } from 'express';
import { getGlobalLeaderboard } from '../services/leaderboardService.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export const getGlobalLeaderboardController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const data = await getGlobalLeaderboard(limit);

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch global leaderboard',
    });
  }
};
