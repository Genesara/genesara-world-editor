/**
 * Auth-aware fetch wrapper. The bearer token is held in memory only (ADR-0004)
 * — a page reload signs you out. Editor screens consume this via the legacy
 * window events (`auth:login` / `auth:logout`); the merged admin context wraps
 * the same primitives so both halves of the app share a single token.
 */

import { getApiBaseUrlOrThrow } from './apiConfig';

let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(value: string): void {
  token = value;
  window.dispatchEvent(new Event('auth:login'));
}

export function clearToken(): void {
  token = null;
  window.dispatchEvent(new Event('auth:logout'));
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const t = getToken();
  const headers = new Headers(init.headers);
  if (t) headers.set('Authorization', `Bearer ${t}`);
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
