import { Response } from 'express';
import { evaluateAndUnlockAchievements } from '../services/achievementService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import {
  addCoinsDev,
  claimDailyCoins,
  equipCustomizationItem,
  getCustomizationOverview,
  resetCoinsDev,
  resetCustomizationProgressDev,
  unlockCustomizationItem,
} from '../services/customizationService.js';
import { parseInteger, sanitizeSlug } from '../utils/inputSanitizer.js';

const getUserIdOrFail = (req: AuthenticatedRequest) => req.user?.id ?? null;

export const getCustomizationOverviewController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await getCustomizationOverview(userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching customization overview:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch customization data',
    });
  }
};

export const claimDailyCoinsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await claimDailyCoins(userId);
    return res.json({ success: true, message: 'Daily coins claimed', data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim daily coins';
    const status = message.includes('already claimed') ? 409 : 400;
    return res.status(status).json({ success: false, message });
  }
};

export const addCoinsDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const amount = parseInteger(req.body.amount, 0);
    const data = await addCoinsDev(userId, amount);
    return res.json({ success: true, message: `Added ${data.added} coins`, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add coins',
    });
  }
};

export const resetCustomizationProgressDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await resetCustomizationProgressDev(userId);
    return res.json({ success: true, message: 'Customization progress reset', data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset customization progress',
    });
  }
};

export const resetCoinsDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const data = await resetCoinsDev(userId);
    return res.json({ success: true, message: `Coins reset to ${data.resetTo}`, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset coins',
    });
  }
};

export const unlockCustomizationItemController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const itemId = sanitizeSlug(req.body.itemId);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId is required' });
    }

    const data = await unlockCustomizationItem(userId, itemId);
    const achievementResult = data.alreadyOwned ? { newlyUnlocked: [] } : await evaluateAndUnlockAchievements(userId);

    return res.json({
      success: true,
      message: `${data.itemName} unlocked`,
      data,
      meta: achievementResult.newlyUnlocked.length > 0 ? { achievementsUnlocked: achievementResult.newlyUnlocked } : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unlock item';
    const status = message.includes('Not enough coins') ? 400 : 404;
    return res.status(status).json({ success: false, message });
  }
};

export const equipCustomizationItemController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdOrFail(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const itemId = sanitizeSlug(req.body.itemId);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId is required' });
    }

    const data = await equipCustomizationItem(userId, itemId);
    return res.json({ success: true, message: `${data.itemName} equipped`, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to equip item';
    const status = message.includes('unlock') ? 400 : 404;
    return res.status(status).json({ success: false, message });
  }
};
