import { env } from '../../../shared/config/env';
import { getSimulatedDayOffset } from '../../../shared/dev/simulatedDay';
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
  const requestUrl = new URL(`${env.apiBaseUrl}/api/slime/me`);
  const simulatedDayOffset = getSimulatedDayOffset();
  if (env.enableDevPanel && simulatedDayOffset !== 0) {
    requestUrl.searchParams.set('simulatedDayOffset', String(simulatedDayOffset));
  }

  const response = await fetch(requestUrl.toString(), {
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

export const updateSlimeName = async (token: string, name: string): Promise<SlimeData> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/me/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const payload = (await response.json()) as ApiResponse<SlimeData>;
  assertSuccessfulResponse(response, payload, 'Failed to update slime name');

  if (!payload.data) {
    throw new Error('Updated slime data is missing from API response');
  }

  return payload.data;
};

type ResetXpResponse = {
  totalExperience: number;
  level: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
  experienceToNextLevel: number;
  levelProgressPercent: number;
};

export const resetSlimeXpDev = async (token: string): Promise<ResetXpResponse> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/me/dev-reset-xp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<ResetXpResponse>;
  assertSuccessfulResponse(response, payload, 'Failed to reset slime XP');

  if (!payload.data) {
    throw new Error('Reset XP response is missing data');
  }

  return payload.data;
};

type ResetAchievementsResponse = {
  deletedCount: number;
};

export const resetSlimeAchievementsDev = async (token: string): Promise<ResetAchievementsResponse> => {
  const response = await fetch(`${env.apiBaseUrl}/api/slime/me/dev-reset-achievements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<ResetAchievementsResponse>;
  assertSuccessfulResponse(response, payload, 'Failed to reset achievements');

  if (!payload.data) {
    throw new Error('Reset achievements response is missing data');
  }

  return payload.data;
};
