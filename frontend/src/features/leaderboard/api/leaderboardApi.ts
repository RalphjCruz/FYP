import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { LeaderboardEntry } from '../types';

const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const assertSuccess = <T>(response: Response, payload: ApiResponse<T>, fallback: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallback);
  }
};

export const getGlobalLeaderboard = async (token: string, limit = 20): Promise<LeaderboardEntry[]> => {
  const response = await fetch(`${env.apiBaseUrl}/api/leaderboard/global?limit=${limit}`, {
    headers: createAuthHeaders(token),
  });
  const payload = (await response.json()) as ApiResponse<LeaderboardEntry[]>;

  assertSuccess(response, payload, 'Failed to fetch global leaderboard');
  return payload.data ?? [];
};
