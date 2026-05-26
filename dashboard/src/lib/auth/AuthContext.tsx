import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { configureApi, request } from '../api/client';
import { ApiError } from '../api/error';

interface LoginResponse {
  token: string;
}

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
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const logout = useCallback(() => {
    setToken(null);
    setLoginError(null);
  }, []);

  useEffect(() => {
    configureApi({
      token: () => tokenRef.current,
      onUnauthorized: () => {
        // 401 anywhere: drop the bearer; route guard will bounce to login.
        setToken(null);
      },
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const basic = btoa(`${username}:${password}`);
      const res = await request<LoginResponse>('/admin/login', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}` },
      });
      setToken(res.token);
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
