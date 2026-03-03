import type { Response } from 'express';
import { getAnalyticsSummary } from '../services/analyticsService.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export const getMyAnalyticsSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await getAnalyticsSummary(userId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch analytics summary',
    });
  }
};
