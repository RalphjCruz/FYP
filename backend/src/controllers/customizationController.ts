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
import {
  getCustomizationErrorMessage,
  mapClaimDailyCoinsErrorStatus,
  mapEquipCustomizationErrorStatus,
  mapUnlockCustomizationErrorStatus,
} from './mappers/customizationErrorMapper.js';
import { requireAuthenticatedUserId } from './validators/requestAuth.js';
import { parseCustomizationDevCoinAmount, parseCustomizationItemId } from './validators/customizationRequestValidators.js';

export const getCustomizationOverviewController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const data = await getCustomizationOverview(userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching customisation overview:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch customisation data',
    });
  }
};

export const claimDailyCoinsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const data = await claimDailyCoins(userId);
    return res.json({ success: true, message: 'Daily coins claimed', data });
  } catch (error) {
    const message = getCustomizationErrorMessage(error, 'Failed to claim daily coins');
    const status = mapClaimDailyCoinsErrorStatus(message);
    return res.status(status).json({ success: false, message });
  }
};

export const addCoinsDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const amount = parseCustomizationDevCoinAmount(req.body.amount);
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
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const data = await resetCustomizationProgressDev(userId);
    return res.json({ success: true, message: 'Customisation progress reset', data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset customisation progress',
    });
  }
};

export const resetCoinsDevController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

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
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const itemId = parseCustomizationItemId(req.body.itemId);
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
    const message = getCustomizationErrorMessage(error, 'Failed to unlock item');
    const status = mapUnlockCustomizationErrorStatus(message);
    return res.status(status).json({ success: false, message });
  }
};

export const equipCustomizationItemController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const itemId = parseCustomizationItemId(req.body.itemId);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId is required' });
    }

    const data = await equipCustomizationItem(userId, itemId);
    return res.json({ success: true, message: `${data.itemName} equipped`, data });
  } catch (error) {
    const message = getCustomizationErrorMessage(error, 'Failed to equip item');
    const status = mapEquipCustomizationErrorStatus(message);
    return res.status(status).json({ success: false, message });
  }
};
