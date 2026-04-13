import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';

export type AccountDeletionStatus = 'none' | 'pending' | 'cancelled' | 'purged';

export type AccountDeletionStatusPayload = {
  status: AccountDeletionStatus;
  requestedAt: string | null;
  scheduledPurgeAt: string | null;
  cancelledAt: string | null;
};

export type AccountDeletionActionPayload = {
  status: 'pending' | 'cancelled' | 'none';
  requestedAt: string | null;
  scheduledPurgeAt: string | null;
  cancelledAt: string | null;
  idempotent: boolean;
};

export type AccountExportPayload = {
  format: 'json';
  exportedAt: string;
  user: {
    id: number;
    email: string;
    username: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  domains: Record<string, unknown>;
};

const assertSuccess = <T>(response: Response, payload: ApiResponse<T>, fallbackMessage: string): T => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }

  if (!payload.data) {
    throw new Error(payload.message || `${fallbackMessage}: missing response data`);
  }

  return payload.data;
};

export const getAccountDeletionStatus = async (token: string): Promise<AccountDeletionStatusPayload> => {
  const response = await fetch(`${env.apiBaseUrl}/api/account/deletion/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as ApiResponse<AccountDeletionStatusPayload>;
  return assertSuccess(response, payload, 'Failed to fetch account deletion status');
};

export const requestAccountDeletionAction = async (
  token: string,
): Promise<{ data: AccountDeletionActionPayload; message: string | null }> => {
  const response = await fetch(`${env.apiBaseUrl}/api/account/deletion/request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<AccountDeletionActionPayload>;
  const data = assertSuccess(response, payload, 'Failed to request account deletion');
  return {
    data,
    message: payload.message ?? null,
  };
};

export const cancelAccountDeletionAction = async (
  token: string,
): Promise<{ data: AccountDeletionActionPayload; message: string | null }> => {
  const response = await fetch(`${env.apiBaseUrl}/api/account/deletion/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as ApiResponse<AccountDeletionActionPayload>;
  const data = assertSuccess(response, payload, 'Failed to cancel account deletion request');
  return {
    data,
    message: payload.message ?? null,
  };
};

export const exportAccountData = async (token: string): Promise<AccountExportPayload> => {
  const response = await fetch(`${env.apiBaseUrl}/api/account/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as ApiResponse<AccountExportPayload>;
  return assertSuccess(response, payload, 'Failed to export account data');
};
