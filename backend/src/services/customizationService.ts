import pool from '../config/database.js';

export type CosmeticSlot = 'aura' | 'hat' | 'trail';

export type CosmeticItem = {
  id: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  priceCoins: number;
  isStarter: boolean;
  previewGradient: string;
};

export type CustomizationOverview = {
  wallet: {
    coins: number;
    dailyClaimAvailable: boolean;
    lastDailyClaimAt: string | null;
  };
  catalog: CosmeticItem[];
  ownedItemIds: string[];
  equippedBySlot: Partial<Record<CosmeticSlot, string>>;
};

const DAILY_CLAIM_REWARD = 50;

const COSMETIC_CATALOG: CosmeticItem[] = [
  {
    id: 'sprout-aura',
    name: 'Sprout Aura',
    description: 'Starter glow around your slime.',
    slot: 'aura',
    priceCoins: 0,
    isStarter: true,
    previewGradient: 'linear-gradient(135deg, #34d399, #1f7a66)',
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'Cool cyan pulse for focus-heavy sessions.',
    slot: 'aura',
    priceCoins: 120,
    isStarter: false,
    previewGradient: 'linear-gradient(135deg, #22d3ee, #1f4d6b)',
  },
  {
    id: 'scholar-cap',
    name: 'Scholar Cap',
    description: 'Academic cap for presentation mode.',
    slot: 'hat',
    priceCoins: 160,
    isStarter: false,
    previewGradient: 'linear-gradient(135deg, #a78bfa, #3f3b66)',
  },
  {
    id: 'comet-trail',
    name: 'Comet Trail',
    description: 'Fiery trail effect when your slime evolves.',
    slot: 'trail',
    priceCoins: 200,
    isStarter: false,
    previewGradient: 'linear-gradient(135deg, #fb923c, #433145)',
  },
  {
    id: 'tiny-crown',
    name: 'Tiny Crown',
    description: 'Small gold crown for streak flexing.',
    slot: 'hat',
    priceCoins: 260,
    isStarter: false,
    previewGradient: 'linear-gradient(135deg, #facc15, #4a4130)',
  },
];

const catalogById = new Map(COSMETIC_CATALOG.map((item) => [item.id, item]));

let schemaInitialized = false;

const ensureCustomizationSchema = async () => {
  if (schemaInitialized) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customization_wallets (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      coins INTEGER NOT NULL DEFAULT 250 CHECK (coins >= 0),
      last_daily_claim_at DATE NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_customization_inventory (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id VARCHAR(80) NOT NULL,
      unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, item_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_customization_loadout (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot_key VARCHAR(20) NOT NULL,
      item_id VARCHAR(80) NOT NULL,
      equipped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, slot_key)
    );
  `);

  schemaInitialized = true;
};

const ensureUserWallet = async (userId: number) => {
  await pool.query(
    `INSERT INTO customization_wallets (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
};

const getOverviewRows = async (userId: number) => {
  await ensureCustomizationSchema();
  await ensureUserWallet(userId);

  const [walletResult, inventoryResult, loadoutResult] = await Promise.all([
    pool.query(
      `SELECT coins, last_daily_claim_at
       FROM customization_wallets
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT item_id
       FROM user_customization_inventory
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT slot_key, item_id
       FROM user_customization_loadout
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  return {
    walletRow: walletResult.rows[0] as { coins: number; last_daily_claim_at: string | null } | undefined,
    inventoryRows: inventoryResult.rows as Array<{ item_id: string }>,
    loadoutRows: loadoutResult.rows as Array<{ slot_key: string; item_id: string }>,
  };
};

const buildOverview = async (userId: number): Promise<CustomizationOverview> => {
  const { walletRow, inventoryRows, loadoutRows } = await getOverviewRows(userId);
  const ownedItemIds = new Set<string>(inventoryRows.map((row) => row.item_id));

  for (const starter of COSMETIC_CATALOG.filter((item) => item.isStarter)) {
    ownedItemIds.add(starter.id);
  }

  const equippedBySlot: Partial<Record<CosmeticSlot, string>> = {};
  for (const row of loadoutRows) {
    if (row.slot_key === 'aura' || row.slot_key === 'hat' || row.slot_key === 'trail') {
      equippedBySlot[row.slot_key] = row.item_id;
    }
  }

  // Auto-equip starter aura for first-time users if nothing equipped for aura
  if (!equippedBySlot.aura) {
    equippedBySlot.aura = 'sprout-aura';
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const lastClaim = walletRow?.last_daily_claim_at ?? null;

  return {
    wallet: {
      coins: Number(walletRow?.coins ?? 250),
      dailyClaimAvailable: lastClaim !== todayIso,
      lastDailyClaimAt: lastClaim,
    },
    catalog: COSMETIC_CATALOG,
    ownedItemIds: [...ownedItemIds],
    equippedBySlot,
  };
};

export const getCustomizationOverview = async (userId: number) => {
  return buildOverview(userId);
};

export const claimDailyCoins = async (userId: number) => {
  await ensureCustomizationSchema();
  await ensureUserWallet(userId);

  const todayIso = new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `UPDATE customization_wallets
     SET coins = coins + $2,
         last_daily_claim_at = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND (last_daily_claim_at IS NULL OR last_daily_claim_at <> $3)
     RETURNING coins`,
    [userId, DAILY_CLAIM_REWARD, todayIso],
  );

  if (result.rows.length === 0) {
    throw new Error('Daily reward already claimed today');
  }

  return {
    coins: Number(result.rows[0].coins),
    reward: DAILY_CLAIM_REWARD,
  };
};

export const addCoinsDev = async (userId: number, amount: number) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer');
  }

  await ensureCustomizationSchema();
  await ensureUserWallet(userId);

  const result = await pool.query(
    `UPDATE customization_wallets
     SET coins = coins + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING coins`,
    [userId, amount],
  );

  return {
    coins: Number(result.rows[0].coins),
    added: amount,
  };
};

export const unlockCustomizationItem = async (userId: number, itemId: string) => {
  const item = catalogById.get(itemId);
  if (!item) {
    throw new Error('Unknown cosmetic item');
  }

  if (item.isStarter) {
    return {
      itemId,
      itemName: item.name,
      coins: (await getCustomizationOverview(userId)).wallet.coins,
      alreadyOwned: true,
    };
  }

  await ensureCustomizationSchema();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO customization_wallets (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );

    const ownedResult = await client.query(
      `SELECT 1
       FROM user_customization_inventory
       WHERE user_id = $1 AND item_id = $2`,
      [userId, itemId],
    );

    if (ownedResult.rows.length > 0) {
      const walletResult = await client.query(
        `SELECT coins FROM customization_wallets WHERE user_id = $1`,
        [userId],
      );

      await client.query('COMMIT');
      return {
        itemId,
        itemName: item.name,
        coins: Number(walletResult.rows[0]?.coins ?? 0),
        alreadyOwned: true,
      };
    }

    const walletResult = await client.query(
      `SELECT coins FROM customization_wallets WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    const currentCoins = Number(walletResult.rows[0]?.coins ?? 0);
    if (currentCoins < item.priceCoins) {
      throw new Error(`Not enough coins to unlock ${item.name}`);
    }

    const updatedWallet = await client.query(
      `UPDATE customization_wallets
       SET coins = coins - $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING coins`,
      [userId, item.priceCoins],
    );

    await client.query(
      `INSERT INTO user_customization_inventory (user_id, item_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, item_id) DO NOTHING`,
      [userId, itemId],
    );

    await client.query('COMMIT');

    return {
      itemId,
      itemName: item.name,
      coins: Number(updatedWallet.rows[0].coins),
      alreadyOwned: false,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const equipCustomizationItem = async (userId: number, itemId: string) => {
  const item = catalogById.get(itemId);
  if (!item) {
    throw new Error('Unknown cosmetic item');
  }

  await ensureCustomizationSchema();
  await ensureUserWallet(userId);

  if (!item.isStarter) {
    const ownedResult = await pool.query(
      `SELECT 1
       FROM user_customization_inventory
       WHERE user_id = $1 AND item_id = $2`,
      [userId, itemId],
    );

    if (ownedResult.rows.length === 0) {
      throw new Error('Item must be unlocked before equipping');
    }
  }

  await pool.query(
    `INSERT INTO user_customization_loadout (user_id, slot_key, item_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, slot_key)
     DO UPDATE SET item_id = EXCLUDED.item_id, equipped_at = CURRENT_TIMESTAMP`,
    [userId, item.slot, item.id],
  );

  return {
    itemId: item.id,
    itemName: item.name,
    slot: item.slot,
  };
};

