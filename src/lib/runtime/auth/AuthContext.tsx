import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getToken, clearToken, login as apiLogin } from '@/utils/api';
import { ApiError } from '../api/error';

/**
 * Admin auth context. Thin wrapper around the editor's shared token store
 * (`src/utils/api.ts`) — in-memory per ADR-0004, with `auth:login` /
 * `auth:logout` window events keeping editor screens and admin views in sync.
 */

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Keep React state in sync with the underlying in-memory token. Editor's
  // legacy auth dispatches window events; we subscribe to those.
  useEffect(() => {
    const sync = () => setTokenState(getToken());
    window.addEventListener('auth:login', sync);
    window.addEventListener('auth:logout', sync);
    return () => {
      window.removeEventListener('auth:login', sync);
      window.removeEventListener('auth:logout', sync);
    };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setLoginError(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await apiLogin(username, password);
    } catch (e) {
      if (e instanceof ApiError) {
        setLoginError(e.detail ?? e.title);
      } else if (e instanceof Error) {
        setLoginError(e.message);
      } else {
        setLoginError('Login failed');
      }
      throw e;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      isAuthenticated: !!token,
      isLoggingIn,
      loginError,
      login,
      logout,
    }),
    [token, isLoggingIn, loginError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
