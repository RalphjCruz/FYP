import { env } from '../../../shared/config/env';
import type { ApiResponse } from '../../../shared/types/api';
import type { AuthSession, AuthUser } from '../types';

type AuthPayload = {
  token: string;
  user: AuthUser;
};

const assertAuthSuccess = (response: Response, payload: ApiResponse<AuthPayload | AuthUser>, fallbackMessage: string) => {
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || fallbackMessage);
  }
};

export const register = async (payload: { username: string; email: string; password: string }): Promise<AuthSession> => {
  const response = await fetch(`${env.apiBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ApiResponse<AuthPayload>;
  assertAuthSuccess(response, data, 'Registration failed');

  if (!data.data?.token || !data.data.user) {
    throw new Error('Invalid register response from server');
  }

  return {
    token: data.data.token,
    user: data.data.user,
  };
};

export const login = async (payload: { email: string; password: string }): Promise<AuthSession> => {
  const response = await fetch(`${env.apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ApiResponse<AuthPayload>;
  assertAuthSuccess(response, data, 'Login failed');

  if (!data.data?.token || !data.data.user) {
    throw new Error('Invalid login response from server');
  }

  return {
    token: data.data.token,
    user: data.data.user,
  };
};

export const getMe = async (token: string): Promise<AuthUser> => {
  const response = await fetch(`${env.apiBaseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as ApiResponse<AuthUser>;
  assertAuthSuccess(response, data, 'Could not load current user');

  if (!data.data) {
    throw new Error('Invalid profile response from server');
  }

  return data.data;
};
