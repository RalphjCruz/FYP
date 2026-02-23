import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { CustomizationOverview } from '../types';

const createAuthHeaders = (token: string, withJson = false) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (withJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const assertSuccess = <T>(response: Response, payload: ApiResponse<T>, fallback: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallback);
  }
};

export const getCustomizationOverview = async (token: string): Promise<CustomizationOverview> => {
  const response = await fetch(`${env.apiBaseUrl}/api/customization/overview`, {
    headers: createAuthHeaders(token),
  });
  const payload = (await response.json()) as ApiResponse<CustomizationOverview>;

  assertSuccess(response, payload, 'Failed to load customization data');

  if (!payload.data) {
    throw new Error('Customization overview missing from response');
  }

  return payload.data;
};

export const claimDailyCoins = async (token: string) => {
  const response = await fetch(`${env.apiBaseUrl}/api/customization/wallet/claim-daily`, {
    method: 'POST',
    headers: createAuthHeaders(token),
  });
  const payload = (await response.json()) as ApiResponse<{ coins: number; reward: number }>;
  assertSuccess(response, payload, 'Failed to claim daily coins');
  return payload.data;
};

export const addCoinsDev = async (token: string, amount: number) => {
  const response = await fetch(`${env.apiBaseUrl}/api/customization/wallet/dev-add`, {
    method: 'POST',
    headers: createAuthHeaders(token, true),
    body: JSON.stringify({ amount }),
  });
  const payload = (await response.json()) as ApiResponse<{ coins: number; added: number }>;
  assertSuccess(response, payload, 'Failed to add demo coins');
  return payload.data;
};

export const unlockCustomizationItem = async (token: string, itemId: string) => {
  const response = await fetch(`${env.apiBaseUrl}/api/customization/items/unlock`, {
    method: 'POST',
    headers: createAuthHeaders(token, true),
    body: JSON.stringify({ itemId }),
  });
  const payload = (await response.json()) as ApiResponse<{
    itemId: string;
    itemName: string;
    coins: number;
    alreadyOwned?: boolean;
  }>;
  assertSuccess(response, payload, 'Failed to unlock item');
  return payload.data;
};

export const equipCustomizationItem = async (token: string, itemId: string) => {
  const response = await fetch(`${env.apiBaseUrl}/api/customization/items/equip`, {
    method: 'POST',
    headers: createAuthHeaders(token, true),
    body: JSON.stringify({ itemId }),
  });
  const payload = (await response.json()) as ApiResponse<{
    itemId: string;
    itemName: string;
    slot: string;
  }>;
  assertSuccess(response, payload, 'Failed to equip item');
  return payload.data;
};

