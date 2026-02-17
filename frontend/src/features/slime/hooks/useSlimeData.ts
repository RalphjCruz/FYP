import { useCallback, useEffect, useState } from 'react';
import { getSlimeData } from '../api/slimeApi';
import type { SlimeData } from '../types';

export const useSlimeData = (token: string | null) => {
  const [slimeData, setSlimeData] = useState<SlimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlimeData = useCallback(async () => {
    if (!token) {
      setSlimeData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getSlimeData(token);
      setSlimeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to backend. Make sure the server is running!');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchSlimeData();
  }, [fetchSlimeData]);

  return {
    slimeData,
    loading,
    error,
    fetchSlimeData,
  };
};
