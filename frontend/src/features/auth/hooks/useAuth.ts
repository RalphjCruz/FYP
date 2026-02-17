import { useCallback, useEffect, useState } from 'react';
import { parseApiErrorMessage } from '../../../shared/types/api';
import { getMe, login as loginApi, register as registerApi } from '../api/authApi';
import type { AuthMode, AuthSession, AuthUser } from '../types';

const AUTH_TOKEN_STORAGE_KEY = 'myslime:auth_token';

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

const persistToken = (token: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
};

const clearStoredToken = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((session: AuthSession) => {
    setToken(session.token);
    setUser(session.user);
    persistToken(session.token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
    clearStoredToken();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const session = await loginApi({ email, password });
        applySession(session);
        return true;
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Login failed'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const session = await registerApi({ username, email, password });
        applySession(session);
        return true;
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Registration failed'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [applySession],
  );

  const submitAuth = useCallback(
    async (mode: AuthMode, payload: { username?: string; email: string; password: string }) => {
      if (mode === 'register') {
        return register(payload.username ?? '', payload.email, payload.password);
      }

      return login(payload.email, payload.password);
    },
    [login, register],
  );

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const currentUser = await getMe(token);
        setUser(currentUser);
      } catch (err) {
        setError(parseApiErrorMessage(err, 'Session expired. Please login again.'));
        logout();
      } finally {
        setInitializing(false);
      }
    };

    void bootstrap();
  }, [logout, token]);

  return {
    token,
    user,
    loading,
    initializing,
    error,
    isAuthenticated: Boolean(token && user),
    submitAuth,
    logout,
  };
};
