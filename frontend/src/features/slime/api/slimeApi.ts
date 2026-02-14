import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { SlimeData } from '../types';

const assertSuccessfulResponse = (payload: ApiResponse<SlimeData>, fallbackMessage: string) => {
  if (!payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }
};

export const getSlimeData = async (userId = 1): Promise<SlimeData> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/${userId}`);
  const payload = (await response.json()) as ApiResponse<SlimeData>;

  assertSuccessfulResponse(payload, 'Failed to fetch slime data');

  if (!payload.data) {
    throw new Error('Slime data is missing from API response');
  }

  return payload.data;
};

export const createSlimeTestUser = async (): Promise<void> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/test-user`, {
    method: 'POST',
  });
  const payload = (await response.json()) as ApiResponse<SlimeData>;

  assertSuccessfulResponse(payload, 'Failed to create test user');
};
