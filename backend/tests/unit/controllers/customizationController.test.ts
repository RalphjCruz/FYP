import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../src/types/auth.js';
import {
  addCoinsDevController,
  claimDailyCoinsController,
  equipCustomizationItemController,
  getCustomizationOverviewController,
  resetCoinsDevController,
  resetCustomizationProgressDevController,
  unlockCustomizationItemController,
} from '../../../src/controllers/customizationController.js';
import * as customizationService from '../../../src/services/customizationService.js';
import * as achievementService from '../../../src/services/achievementService.js';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-CCTRL-001 getCustomizationOverviewController', () => {
  it('returns 401 and exits early when authenticated user is missing', async () => {
    const req = { user: undefined } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const overviewMock = jest.spyOn(customizationService, 'getCustomizationOverview') as unknown as jest.Mock;

    await getCustomizationOverviewController(req, res);

    expect(overviewMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-002 getCustomizationOverviewController', () => {
  it('returns customization overview payload for authenticated user', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const overviewMock = jest.spyOn(customizationService, 'getCustomizationOverview') as unknown as jest.Mock;
    overviewMock.mockResolvedValue({
      wallet: { coins: 300, dailyClaimAvailable: true, lastDailyClaimAt: null },
      catalog: [],
      ownedItemIds: ['sprout-aura'],
      equippedBySlot: { aura: 'sprout-aura', color: 'slime-green' },
    });

    await getCustomizationOverviewController(req, res);

    expect(overviewMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        wallet: { coins: 300, dailyClaimAvailable: true, lastDailyClaimAt: null },
        catalog: [],
        ownedItemIds: ['sprout-aura'],
        equippedBySlot: { aura: 'sprout-aura', color: 'slime-green' },
      },
    });
  });
});

describe('TC-CCTRL-003 claimDailyCoinsController', () => {
  it('maps already-claimed service error to 409 response', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const claimMock = jest.spyOn(customizationService, 'claimDailyCoins') as unknown as jest.Mock;
    claimMock.mockRejectedValue(new Error('Daily reward already claimed today'));

    await claimDailyCoinsController(req, res);

    expect(claimMock).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Daily reward already claimed today',
    });
  });
});

describe('TC-CCTRL-004 addCoinsDevController', () => {
  it('parses amount, calls service, and returns success message with payload', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { amount: '25' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const addCoinsMock = jest.spyOn(customizationService, 'addCoinsDev') as unknown as jest.Mock;
    addCoinsMock.mockResolvedValue({ coins: 275, added: 25 });

    await addCoinsDevController(req, res);

    expect(addCoinsMock).toHaveBeenCalledWith(7, 25);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Added 25 coins',
      data: { coins: 275, added: 25 },
    });
  });
});

describe('TC-CCTRL-005 unlockCustomizationItemController', () => {
  it('returns 400 when parsed itemId is missing/invalid', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: '###' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const unlockMock = jest.spyOn(customizationService, 'unlockCustomizationItem') as unknown as jest.Mock;

    await unlockCustomizationItemController(req, res);

    expect(unlockMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'itemId is required',
    });
  });
});

describe('TC-CCTRL-006 unlockCustomizationItemController', () => {
  it('returns unlock payload with achievements meta when new achievements are unlocked', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: 'slime-pink' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const unlockMock = jest.spyOn(customizationService, 'unlockCustomizationItem') as unknown as jest.Mock;
    unlockMock.mockResolvedValue({
      itemId: 'slime-pink',
      itemName: 'Blush Pop',
      coins: 410,
      alreadyOwned: false,
    });

    const achievementMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;
    achievementMock.mockResolvedValue({
      newlyUnlocked: [
        {
          key: 'first_unlock',
          name: 'First Unlock',
          description: 'Unlock your first item.',
          badgeIcon: '',
          unlockedAt: '2026-04-09T10:00:00.000Z',
        },
      ],
    });

    await unlockCustomizationItemController(req, res);

    expect(unlockMock).toHaveBeenCalledWith(7, 'slime-pink');
    expect(achievementMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Blush Pop unlocked',
      data: {
        itemId: 'slime-pink',
        itemName: 'Blush Pop',
        coins: 410,
        alreadyOwned: false,
      },
      meta: {
        achievementsUnlocked: [
          {
            key: 'first_unlock',
            name: 'First Unlock',
            description: 'Unlock your first item.',
            badgeIcon: '',
            unlockedAt: '2026-04-09T10:00:00.000Z',
          },
        ],
      },
    });
  });
});

describe('TC-CCTRL-007 getCustomizationOverviewController', () => {
  it('returns 500 with Error message when overview retrieval fails unexpectedly', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const overviewMock = jest.spyOn(customizationService, 'getCustomizationOverview') as unknown as jest.Mock;
    overviewMock.mockRejectedValue(new Error('overview failed'));

    await getCustomizationOverviewController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'overview failed',
    });
  });
});

describe('TC-CCTRL-008 claimDailyCoinsController', () => {
  it('maps non-duplicate claim failure to 400 with fallback error message', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const claimMock = jest.spyOn(customizationService, 'claimDailyCoins') as unknown as jest.Mock;
    claimMock.mockRejectedValue('unexpected-claim-error');

    await claimDailyCoinsController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to claim daily coins',
    });
  });
});

describe('TC-CCTRL-009 addCoinsDevController', () => {
  it('returns 400 fallback message when add-coins service throws non-Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { amount: '10' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const addCoinsMock = jest.spyOn(customizationService, 'addCoinsDev') as unknown as jest.Mock;
    addCoinsMock.mockRejectedValue('dev-add-failed');

    await addCoinsDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to add coins',
    });
  });
});

describe('TC-CCTRL-010 resetCustomizationProgressDevController', () => {
  it('returns success payload and maps non-Error failure to 400 fallback', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetProgressMock = jest.spyOn(customizationService, 'resetCustomizationProgressDev') as unknown as jest.Mock;
    resetProgressMock
      .mockResolvedValueOnce({ removedUnlockedItems: 2, removedLoadoutItems: 1, starterItemIds: ['sprout-aura'] })
      .mockRejectedValueOnce('reset-progress-failed');

    await resetCustomizationProgressDevController(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Customisation progress reset',
      data: { removedUnlockedItems: 2, removedLoadoutItems: 1, starterItemIds: ['sprout-aura'] },
    });

    await resetCustomizationProgressDevController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to reset customisation progress',
    });
  });
});

describe('TC-CCTRL-011 resetCoinsDevController', () => {
  it('returns success payload and maps Error failure to 400 with message', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetCoinsMock = jest.spyOn(customizationService, 'resetCoinsDev') as unknown as jest.Mock;
    resetCoinsMock.mockResolvedValueOnce({ coins: 250, resetTo: 250 }).mockRejectedValueOnce(new Error('reset failed'));

    await resetCoinsDevController(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Coins reset to 250',
      data: { coins: 250, resetTo: 250 },
    });

    await resetCoinsDevController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'reset failed',
    });
  });
});

describe('TC-CCTRL-012 unlockCustomizationItemController', () => {
  it('maps unlock service unknown-item error to 404 response', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: 'slime-pink' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const unlockMock = jest.spyOn(customizationService, 'unlockCustomizationItem') as unknown as jest.Mock;
    unlockMock.mockRejectedValue(new Error('Unknown cosmetic item'));

    await unlockCustomizationItemController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unknown cosmetic item',
    });
  });
});

describe('TC-CCTRL-013 equipCustomizationItemController', () => {
  it('returns 400 when parsed equip itemId is missing/invalid', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: '@@@' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const equipMock = jest.spyOn(customizationService, 'equipCustomizationItem') as unknown as jest.Mock;

    await equipCustomizationItemController(req, res);

    expect(equipMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'itemId is required',
    });
  });
});

describe('TC-CCTRL-014 equipCustomizationItemController', () => {
  it('returns equip success payload and maps unlock-required error to 400', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: 'slime-pink' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const equipMock = jest.spyOn(customizationService, 'equipCustomizationItem') as unknown as jest.Mock;
    equipMock
      .mockResolvedValueOnce({ itemId: 'slime-pink', itemName: 'Blush Pop', slot: 'color' })
      .mockRejectedValueOnce(new Error('Item must be unlocked before equipping'));

    await equipCustomizationItemController(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Blush Pop equipped',
      data: { itemId: 'slime-pink', itemName: 'Blush Pop', slot: 'color' },
    });

    await equipCustomizationItemController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Item must be unlocked before equipping',
    });
  });
});

describe('TC-CCTRL-015 claimDailyCoinsController', () => {
  it('returns claim success payload with message and data', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const claimMock = jest.spyOn(customizationService, 'claimDailyCoins') as unknown as jest.Mock;
    claimMock.mockResolvedValue({ coins: 350, reward: 50 });

    await claimDailyCoinsController(req, res);

    expect(claimMock).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Daily coins claimed',
      data: { coins: 350, reward: 50 },
    });
  });
});

describe('TC-CCTRL-016 claimDailyCoinsController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const claimMock = jest.spyOn(customizationService, 'claimDailyCoins') as unknown as jest.Mock;

    await claimDailyCoinsController(req, res);

    expect(claimMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-017 addCoinsDevController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined, body: { amount: '10' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const addCoinsMock = jest.spyOn(customizationService, 'addCoinsDev') as unknown as jest.Mock;

    await addCoinsDevController(req, res);

    expect(addCoinsMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-018 addCoinsDevController', () => {
  it('returns 400 with Error.message when service throws Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { amount: '10' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const addCoinsMock = jest.spyOn(customizationService, 'addCoinsDev') as unknown as jest.Mock;
    addCoinsMock.mockRejectedValue(new Error('add failed'));

    await addCoinsDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'add failed',
    });
  });
});

describe('TC-CCTRL-019 unlockCustomizationItemController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined, body: { itemId: 'slime-pink' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const unlockMock = jest.spyOn(customizationService, 'unlockCustomizationItem') as unknown as jest.Mock;

    await unlockCustomizationItemController(req, res);

    expect(unlockMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-020 unlockCustomizationItemController', () => {
  it('skips achievement evaluation and returns meta undefined when item is already owned', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: 'sprout-aura' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const unlockMock = jest.spyOn(customizationService, 'unlockCustomizationItem') as unknown as jest.Mock;
    unlockMock.mockResolvedValue({
      itemId: 'sprout-aura',
      itemName: 'Sprout Aura',
      coins: 300,
      alreadyOwned: true,
    });

    const achievementMock = jest.spyOn(achievementService, 'evaluateAndUnlockAchievements') as unknown as jest.Mock;

    await unlockCustomizationItemController(req, res);

    expect(achievementMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Sprout Aura unlocked',
      data: {
        itemId: 'sprout-aura',
        itemName: 'Sprout Aura',
        coins: 300,
        alreadyOwned: true,
      },
      meta: undefined,
    });
  });
});

describe('TC-CCTRL-021 equipCustomizationItemController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined, body: { itemId: 'slime-pink' } } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const equipMock = jest.spyOn(customizationService, 'equipCustomizationItem') as unknown as jest.Mock;

    await equipCustomizationItemController(req, res);

    expect(equipMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-022 equipCustomizationItemController', () => {
  it('maps unknown-item equip failure to 404 response', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: { itemId: 'slime-pink' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const equipMock = jest.spyOn(customizationService, 'equipCustomizationItem') as unknown as jest.Mock;
    equipMock.mockRejectedValue(new Error('Unknown cosmetic item'));

    await equipCustomizationItemController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unknown cosmetic item',
    });
  });
});

describe('TC-CCTRL-023 getCustomizationOverviewController', () => {
  it('returns 500 fallback message when overview retrieval throws non-Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const overviewMock = jest.spyOn(customizationService, 'getCustomizationOverview') as unknown as jest.Mock;
    overviewMock.mockRejectedValue('overview-non-error');

    await getCustomizationOverviewController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to fetch customisation data',
    });
  });
});

describe('TC-CCTRL-024 resetCustomizationProgressDevController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined, body: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetProgressMock = jest.spyOn(customizationService, 'resetCustomizationProgressDev') as unknown as jest.Mock;

    await resetCustomizationProgressDevController(req, res);

    expect(resetProgressMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-025 resetCustomizationProgressDevController', () => {
  it('returns 400 with Error.message when reset progress service throws Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetProgressMock = jest.spyOn(customizationService, 'resetCustomizationProgressDev') as unknown as jest.Mock;
    resetProgressMock.mockRejectedValue(new Error('progress reset failed'));

    await resetCustomizationProgressDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'progress reset failed',
    });
  });
});

describe('TC-CCTRL-026 resetCoinsDevController', () => {
  it('returns 401 and exits early when auth context is missing', async () => {
    const req = { user: undefined, body: {} } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetCoinsMock = jest.spyOn(customizationService, 'resetCoinsDev') as unknown as jest.Mock;

    await resetCoinsDevController(req, res);

    expect(resetCoinsMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing authenticated user',
    });
  });
});

describe('TC-CCTRL-027 resetCoinsDevController', () => {
  it('returns 400 fallback message when reset coins service throws non-Error', async () => {
    const req = {
      user: { id: 7, email: 'student@example.com', username: 'student' },
      body: {},
    } as unknown as AuthenticatedRequest;
    const res = createMockResponse();

    const resetCoinsMock = jest.spyOn(customizationService, 'resetCoinsDev') as unknown as jest.Mock;
    resetCoinsMock.mockRejectedValue('reset-non-error');

    await resetCoinsDevController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to reset coins',
    });
  });
});
