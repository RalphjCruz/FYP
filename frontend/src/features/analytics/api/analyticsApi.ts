import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { AnalyticsSummary } from '../types';

const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const assertSuccess = <T>(response: Response, payload: ApiResponse<T>, fallback: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallback);
  }
};

export const getAnalyticsSummary = async (token: string): Promise<AnalyticsSummary> => {
  const response = await fetch(`${env.apiBaseUrl}/api/analytics/me/summary`, {
    headers: createAuthHeaders(token),
  });
  const payload = (await response.json()) as ApiResponse<AnalyticsSummary>;

  assertSuccess(response, payload, 'Failed to load analytics summary');
  if (!payload.data) {
    throw new Error('Analytics summary missing from response');
  }

  return payload.data;
};
