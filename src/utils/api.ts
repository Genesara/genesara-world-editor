/**
 * Auth-aware fetch wrapper. Always reads the current bearer token from localStorage and adds
 * it as `Authorization: Bearer <token>`. On 401/403 it clears the stored token and dispatches
 * an `auth:logout` event so the app can redirect to the login screen.
 */

import { getApiBaseUrlOrThrow } from './apiConfig';

const TOKEN_KEY = 'agentic-rpg:admin-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event('auth:login'));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('auth:logout'));
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    // Token is bad or missing — drop it so the app falls back to the login screen.
    clearToken();
  }
  return res;
}

export interface LoginResult {
  token: string;
}

/**
 * POST /admin/login with HTTP Basic credentials. Returns the bearer token on success.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  const basic = btoa(`${username}:${password}`);
  const res = await fetch(`${getApiBaseUrlOrThrow()}/admin/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid username or password');
  }
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error('Login response missing token');
  setToken(body.token);
  return { token: body.token };
}
