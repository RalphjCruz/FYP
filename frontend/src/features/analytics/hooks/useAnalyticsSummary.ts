import { useCallback, useEffect, useState } from 'react';
import { parseApiErrorMessage } from '../../../shared/types/api';
import { getAnalyticsSummary } from '../api';
import type { AnalyticsSummary } from '../types';

export const useAnalyticsSummary = (token: string | null) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    if (!token) {
      setSummary(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsSummary(token);
      setSummary(data);
    } catch (err) {
      setError(parseApiErrorMessage(err, 'Failed to fetch analytics summary'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  return {
    summary,
    loading,
    error,
    refreshSummary,
  };
};
