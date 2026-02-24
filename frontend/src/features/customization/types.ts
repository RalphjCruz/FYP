export type CosmeticSlot = 'aura' | 'hat' | 'trail' | 'color';

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
