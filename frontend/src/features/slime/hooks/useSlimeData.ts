import { useCallback, useEffect, useState } from 'react';
import { createSlimeTestUser, getSlimeData } from '../api/slimeApi';
import type { SlimeData } from '../types';

const USER_ID_STORAGE_KEY = 'myslime:userId';

const readStoredUserId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const persistUserId = (userId: number) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
  }
};

export const useSlimeData = () => {
  const [slimeData, setSlimeData] = useState<SlimeData | null>(null);
  const [userId, setUserId] = useState<number | null>(() => readStoredUserId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlimeByUserId = useCallback(async (targetUserId: number) => {
    const data = await getSlimeData(targetUserId);
    setSlimeData(data);
  }, []);

  const bootstrapSession = useCallback(async () => {
    const user = await createSlimeTestUser();
    setUserId(user.id);
    persistUserId(user.id);
    await loadSlimeByUserId(user.id);
  }, [loadSlimeByUserId]);

  const fetchSlimeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (userId) {
        await loadSlimeByUserId(userId);
      } else {
        await bootstrapSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to backend. Make sure the server is running!');
    } finally {
      setLoading(false);
    }
  }, [bootstrapSession, loadSlimeByUserId, userId]);

  const createTestUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await bootstrapSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to backend. Make sure the server is running!');
    } finally {
      setLoading(false);
    }
  }, [bootstrapSession]);

  useEffect(() => {
    void fetchSlimeData();
  }, [fetchSlimeData]);

  return {
    slimeData,
    userId,
    loading,
    error,
    fetchSlimeData,
    createTestUser,
  };
};
