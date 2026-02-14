import { useCallback, useEffect, useState } from 'react';
import { createSlimeTestUser, getSlimeData } from '../api/slimeApi';
import type { SlimeData } from '../types';

export const useSlimeData = () => {
  const [slimeData, setSlimeData] = useState<SlimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlimeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSlimeData(1);
      setSlimeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to backend. Make sure the server is running!');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTestUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await createSlimeTestUser();
      await fetchSlimeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to backend. Make sure the server is running!');
      setLoading(false);
    }
  }, [fetchSlimeData]);

  useEffect(() => {
    void fetchSlimeData();
  }, [fetchSlimeData]);

  return {
    slimeData,
    loading,
    error,
    fetchSlimeData,
    createTestUser,
  };
};
