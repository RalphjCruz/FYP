import { useCallback, useEffect, useState } from 'react';
import { parseApiErrorMessage } from '../../../shared/types/api';
import { getGlobalLeaderboard } from '../api';
import type { LeaderboardEntry } from '../types';

export const useGlobalLeaderboard = (token: string | null) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    if (!token) {
      setEntries([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getGlobalLeaderboard(token, 20);
      setEntries(data);
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Failed to fetch leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  return {
    entries,
    loading,
    error,
    refreshLeaderboard,
  };
};
