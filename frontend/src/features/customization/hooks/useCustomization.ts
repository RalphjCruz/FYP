import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseApiErrorMessage } from '../../../shared/types/api';
import {
  addCoinsDev as addCoinsDevApi,
  claimDailyCoins as claimDailyCoinsApi,
  equipCustomizationItem as equipCustomizationItemApi,
  getCustomizationOverview as getCustomizationOverviewApi,
  resetCustomizationProgressDev as resetCustomizationProgressDevApi,
  unlockCustomizationItem as unlockCustomizationItemApi,
} from '../api/customizationApi';
import type { CosmeticItem, CustomizationOverview } from '../types';

export const useCustomization = (token: string | null) => {
  const [overview, setOverview] = useState<CustomizationOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const refreshOverview = useCallback(async () => {
    if (!token) {
      setOverview(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCustomizationOverviewApi(token);
      setOverview(data);
      setSelectedItemId((current) => current ?? data.catalog[0]?.id ?? null);
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Could not load customisation data'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  const runMutation = useCallback(
    async (action: () => Promise<void>) => {
      setActionLoading(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Action failed'));
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const claimDailyCoins = useCallback(async () => {
    if (!token) {
      setError('You must be logged in.');
      return false;
    }

    return runMutation(async () => {
      const result = await claimDailyCoinsApi(token);
      setNotice(`Daily reward claimed: +${result?.reward ?? 0} coins`);
      await refreshOverview();
    });
  }, [refreshOverview, runMutation, token]);

  const addCoinsDev = useCallback(
    async (amount: number) => {
      if (!token) {
        setError('You must be logged in.');
        return false;
      }

      return runMutation(async () => {
        const result = await addCoinsDevApi(token, amount);
        setNotice(`Added ${result?.added ?? amount} coins for testing.`);
        await refreshOverview();
      });
    },
    [refreshOverview, runMutation, token],
  );

  const resetCustomizationProgressDev = useCallback(async () => {
    if (!token) {
      setError('You must be logged in.');
      return false;
    }

    return runMutation(async () => {
      const result = await resetCustomizationProgressDevApi(token);
      setNotice(
        `Customisation reset: removed ${result?.removedUnlockedItems ?? 0} unlocked items and ${result?.removedLoadoutItems ?? 0} loadout entries.`,
      );
      await refreshOverview();
    });
  }, [refreshOverview, runMutation, token]);

  const unlockItem = useCallback(
    async (item: CosmeticItem) => {
      if (!token) {
        setError('You must be logged in.');
        return false;
      }

      return runMutation(async () => {
        await unlockCustomizationItemApi(token, item.id);
        setNotice(`${item.name} unlocked.`);
        await refreshOverview();
      });
    },
    [refreshOverview, runMutation, token],
  );

  const equipItem = useCallback(
    async (item: CosmeticItem) => {
      if (!token) {
        setError('You must be logged in.');
        return false;
      }

      return runMutation(async () => {
        await equipCustomizationItemApi(token, item.id);
        setNotice(`${item.name} equipped.`);
        await refreshOverview();
      });
    },
    [refreshOverview, runMutation, token],
  );

  const selectedItem = useMemo(
    () => overview?.catalog.find((item) => item.id === selectedItemId) ?? overview?.catalog[0] ?? null,
    [overview, selectedItemId],
  );

  return {
    overview,
    selectedItem,
    selectedItemId,
    loading,
    actionLoading,
    error,
    notice,
    setSelectedItemId,
    setNotice,
    setError,
    refreshOverview,
    claimDailyCoins,
    addCoinsDev,
    resetCustomizationProgressDev,
    unlockItem,
    equipItem,
  };
};
