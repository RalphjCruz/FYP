import pool from '../../../src/config/database.js';
import {
  addCoinsDev,
  claimDailyCoins,
  equipCustomizationItem,
  resetCustomizationProgressDev,
  getCustomizationOverview,
  resetCoinsDev,
  unlockCustomizationItem,
} from '../../../src/services/customizationService.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-CSV-001 getCustomizationOverview', () => {
  it('returns overview with starter ownership and default aura/color auto-equip', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('FROM customization_wallets')) {
        return {
          rows: [
            {
              coins: 480,
              last_daily_claim_at: null,
            },
          ],
        };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return {
          rows: [{ item_id: 'slime-red' }],
        };
      }

      if (sql.includes('FROM user_customization_loadout')) {
        return {
          rows: [{ slot_key: 'hat', item_id: 'scholar-cap' }],
        };
      }

      return { rows: [] };
    });

    const result = await getCustomizationOverview(7);

    expect(result.wallet).toEqual({
      coins: 480,
      dailyClaimAvailable: true,
      lastDailyClaimAt: null,
    });
    expect(result.ownedItemIds).toEqual(expect.arrayContaining(['sprout-aura', 'slime-green', 'slime-red']));
    expect(result.equippedBySlot).toEqual(
      expect.objectContaining({
        aura: 'sprout-aura',
        color: 'slime-green',
        hat: 'scholar-cap',
      }),
    );
  });
});

describe('TC-CSV-002 claimDailyCoins', () => {
  it('increments wallet coins and returns daily reward payload when claim is available', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE customization_wallets') && sql.includes('coins = coins + $2')) {
        return { rows: [{ coins: 300 }] };
      }

      return { rows: [] };
    });

    const result = await claimDailyCoins(7);

    expect(result).toEqual({
      coins: 300,
      reward: 50,
    });
  });
});

describe('TC-CSV-003 claimDailyCoins', () => {
  it('throws already-claimed error when update query affects no rows', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE customization_wallets') && sql.includes('coins = coins + $2')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    await expect(claimDailyCoins(7)).rejects.toThrow('Daily reward already claimed today');
  });
});

describe('TC-CSV-004 addCoinsDev', () => {
  it('rejects non-positive and non-integer coin amounts before touching persistence', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;

    await expect(addCoinsDev(7, 0)).rejects.toThrow('Amount must be a positive integer');
    await expect(addCoinsDev(7, 2.5)).rejects.toThrow('Amount must be a positive integer');

    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe('TC-CSV-005 resetCoinsDev', () => {
  it('falls back to default wallet coins when update returns an empty row payload', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE customization_wallets') && sql.includes('SET coins = $2')) {
        return { rows: [{}] };
      }

      return { rows: [] };
    });

    const result = await resetCoinsDev(7);
    expect(result).toEqual({
      coins: 250,
      resetTo: 250,
    });
  });
});

describe('TC-CSV-006 unlockCustomizationItem', () => {
  it('rolls back and throws when wallet balance is insufficient for a non-starter item', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    const clientQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT coins FROM customization_wallets WHERE user_id = $1 FOR UPDATE')) {
        return { rows: [{ coins: 100 }] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });

    await expect(unlockCustomizationItem(7, 'tiny-crown')).rejects.toThrow('Not enough coins to unlock Tiny Crown');

    expect(clientQueryMock).toHaveBeenCalledWith('BEGIN');
    expect(clientQueryMock).toHaveBeenCalledWith('ROLLBACK');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-CSV-007 addCoinsDev', () => {
  it('adds coins and returns updated wallet balance for valid positive integer amount', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE customization_wallets') && sql.includes('coins = coins + $2')) {
        return { rows: [{ coins: 355 }] };
      }

      return { rows: [] };
    });

    const result = await addCoinsDev(7, 105);

    expect(result).toEqual({
      coins: 355,
      added: 105,
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE customization_wallets'),
      [7, 105],
    );
  });
});

describe('TC-CSV-008 resetCustomizationProgressDev', () => {
  it('removes non-starter customization state and re-equips starter aura/color items', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('DELETE FROM user_customization_inventory')) {
        return { rowCount: 4 };
      }

      if (sql.includes('DELETE FROM user_customization_loadout')) {
        return { rowCount: 2 };
      }

      return { rows: [] };
    });

    const result = await resetCustomizationProgressDev(7);

    expect(result.removedUnlockedItems).toBe(4);
    expect(result.removedLoadoutItems).toBe(2);
    expect(result.starterItemIds).toEqual(expect.arrayContaining(['sprout-aura', 'slime-green']));
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_customization_loadout'),
      [7, 'aura', 'sprout-aura'],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_customization_loadout'),
      [7, 'color', 'slime-green'],
    );
  });
});

describe('TC-CSV-009 unlockCustomizationItem', () => {
  it('throws when item id does not exist in customization catalog', async () => {
    await expect(unlockCustomizationItem(7, 'unknown-item')).rejects.toThrow('Unknown cosmetic item');
  });
});

describe('TC-CSV-010 unlockCustomizationItem', () => {
  it('returns alreadyOwned true for starter items and keeps wallet coin value from overview', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('FROM customization_wallets')) {
        return { rows: [{ coins: 420, last_daily_claim_at: null }] };
      }

      if (sql.includes('FROM user_customization_inventory') || sql.includes('FROM user_customization_loadout')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await unlockCustomizationItem(7, 'sprout-aura');

    expect(result).toEqual({
      itemId: 'sprout-aura',
      itemName: 'Sprout Aura',
      coins: 420,
      alreadyOwned: true,
    });
  });
});

describe('TC-CSV-011 unlockCustomizationItem', () => {
  it('returns alreadyOwned true and commits when non-starter item is already in inventory', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    const clientQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ exists: 1 }] };
      }

      if (sql.includes('SELECT coins FROM customization_wallets WHERE user_id = $1')) {
        return { rows: [{ coins: 390 }] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });

    const result = await unlockCustomizationItem(7, 'tiny-crown');

    expect(result).toEqual({
      itemId: 'tiny-crown',
      itemName: 'Tiny Crown',
      coins: 390,
      alreadyOwned: true,
    });
    expect(clientQueryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-CSV-012 unlockCustomizationItem', () => {
  it('deducts wallet coins, inserts inventory, and returns alreadyOwned false for successful unlock', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    const clientQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }

      if (sql.includes('SELECT coins FROM customization_wallets WHERE user_id = $1 FOR UPDATE')) {
        return { rows: [{ coins: 500 }] };
      }

      if (sql.includes('UPDATE customization_wallets') && sql.includes('SET coins = coins - $2')) {
        return { rows: [{ coins: 410 }] };
      }

      if (sql.includes('INSERT INTO user_customization_inventory')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });

    const result = await unlockCustomizationItem(7, 'slime-pink');

    expect(result).toEqual({
      itemId: 'slime-pink',
      itemName: 'Blush Pop',
      coins: 410,
      alreadyOwned: false,
    });
    expect(clientQueryMock).toHaveBeenCalledWith('COMMIT');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-CSV-013 equipCustomizationItem', () => {
  it('throws when item id does not exist in customization catalog', async () => {
    await expect(equipCustomizationItem(7, 'missing-item')).rejects.toThrow('Unknown cosmetic item');
  });
});

describe('TC-CSV-014 equipCustomizationItem', () => {
  it('equips starter item without inventory ownership lookup', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async () => ({ rows: [] }));

    const result = await equipCustomizationItem(7, 'sprout-aura');

    expect(result).toEqual({
      itemId: 'sprout-aura',
      itemName: 'Sprout Aura',
      slot: 'aura',
    });
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('FROM user_customization_inventory'),
      [7, 'sprout-aura'],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_customization_loadout'),
      [7, 'aura', 'sprout-aura'],
    );
  });
});

describe('TC-CSV-015 equipCustomizationItem', () => {
  it('rejects non-starter equip when item is not unlocked in inventory', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await expect(equipCustomizationItem(7, 'slime-pink')).rejects.toThrow('Item must be unlocked before equipping');
  });
});

describe('TC-CSV-016 equipCustomizationItem', () => {
  it('equips non-starter item when ownership exists', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ exists: 1 }] };
      }
      return { rows: [] };
    });

    const result = await equipCustomizationItem(7, 'slime-pink');

    expect(result).toEqual({
      itemId: 'slime-pink',
      itemName: 'Blush Pop',
      slot: 'color',
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_customization_loadout'),
      [7, 'color', 'slime-pink'],
    );
  });
});

describe('TC-CSV-017 equipCustomizationItem', () => {
  it('propagates persistence error from loadout upsert', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ exists: 1 }] };
      }
      if (sql.includes('INSERT INTO user_customization_loadout')) {
        throw new Error('loadout write failed');
      }
      return { rows: [] };
    });

    await expect(equipCustomizationItem(7, 'slime-pink')).rejects.toThrow('loadout write failed');
  });
});

describe('TC-CSV-018 getCustomizationOverview', () => {
  it('keeps explicit aura/color loadout values and ignores unsupported slot keys', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }
      if (sql.includes('FROM customization_wallets')) {
        return { rows: [{ coins: 300, last_daily_claim_at: null }] };
      }
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_customization_loadout')) {
        return {
          rows: [
            { slot_key: 'aura', item_id: 'neon-pulse' },
            { slot_key: 'color', item_id: 'slime-red' },
            { slot_key: 'face', item_id: 'ignored-slot' },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await getCustomizationOverview(7);
    expect(result.equippedBySlot).toEqual(
      expect.objectContaining({
        aura: 'neon-pulse',
        color: 'slime-red',
      }),
    );
    expect((result.equippedBySlot as any).face).toBeUndefined();
  });
});

describe('TC-CSV-019 getCustomizationOverview', () => {
  it('falls back wallet coins to default when wallet row is missing', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }
      if (sql.includes('FROM customization_wallets')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_customization_inventory') || sql.includes('FROM user_customization_loadout')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getCustomizationOverview(7);
    expect(result.wallet.coins).toBe(250);
  });
});

describe('TC-CSV-020 resetCustomizationProgressDev', () => {
  it('uses zero fallback when deletion rowCount values are nullish', async () => {
    const queryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('DELETE FROM user_customization_inventory')) {
        return { rowCount: undefined };
      }
      if (sql.includes('DELETE FROM user_customization_loadout')) {
        return { rowCount: undefined };
      }
      return { rows: [] };
    });

    const result = await resetCustomizationProgressDev(7);
    expect(result.removedUnlockedItems).toBe(0);
    expect(result.removedLoadoutItems).toBe(0);
  });
});

describe('TC-CSV-021 unlockCustomizationItem', () => {
  it('returns zero coin fallback when owned-item wallet lookup has no rows', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    const clientQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [{ exists: 1 }] };
      }
      if (sql.includes('SELECT coins FROM customization_wallets WHERE user_id = $1')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });

    const result = await unlockCustomizationItem(7, 'tiny-crown');
    expect(result).toEqual({
      itemId: 'tiny-crown',
      itemName: 'Tiny Crown',
      coins: 0,
      alreadyOwned: true,
    });
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

describe('TC-CSV-022 unlockCustomizationItem', () => {
  it('uses zero fallback for missing locked wallet row and rejects purchase', async () => {
    const poolQueryMock = jest.spyOn(pool, 'query') as unknown as jest.Mock;
    poolQueryMock.mockResolvedValue({ rows: [] });

    const clientQueryMock = jest.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customization_wallets')) {
        return { rows: [] };
      }
      if (sql.includes('FROM user_customization_inventory')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT coins FROM customization_wallets WHERE user_id = $1 FOR UPDATE')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const releaseMock = jest.fn();
    const connectMock = jest.spyOn(pool, 'connect') as unknown as jest.Mock;
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });

    await expect(unlockCustomizationItem(7, 'slime-pink')).rejects.toThrow('Not enough coins to unlock Blush Pop');
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
