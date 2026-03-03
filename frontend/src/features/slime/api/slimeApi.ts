import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { SlimeData } from '../types';

type BootstrapUser = {
  id: number;
  email: string;
  username: string;
};

type BootstrapResponse = {
  user: BootstrapUser;
  slime: unknown;
};

const assertSuccessfulResponse = <T>(response: Response, payload: ApiResponse<T>, fallbackMessage: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }
};

export const getSlimeData = async (token: string): Promise<SlimeData> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await response.json()) as ApiResponse<SlimeData>;

  assertSuccessfulResponse(response, payload, 'Failed to fetch slime data');

  if (!payload.data) {
    throw new Error('Slime data is missing from API response');
  }

  return payload.data;
};

export const createSlimeTestUser = async (): Promise<BootstrapUser> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/test-user`, {
    method: 'POST',
  });
  const payload = (await response.json()) as ApiResponse<BootstrapResponse>;

  assertSuccessfulResponse(response, payload, 'Failed to create test user');

  if (!payload.data?.user) {
    throw new Error(payload.message || 'Failed to create test user');
  }

  return payload.data.user;
};

type AddXpResponse = {
  xpAdded: number;
  level: number;
  totalExperience: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
};

export const addSlimeXpDev = async (token: string, amount = 50): Promise<AddXpResponse> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/me/dev-xp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  const payload = (await response.json()) as ApiResponse<AddXpResponse>;
  assertSuccessfulResponse(response, payload, 'Failed to add XP');

  if (!payload.data) {
    throw new Error('XP response is missing data');
  }

  return payload.data;
};
