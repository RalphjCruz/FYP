import pool from '../../../src/config/database.js';
import {
  addCoinsDev,
  claimDailyCoins,
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
