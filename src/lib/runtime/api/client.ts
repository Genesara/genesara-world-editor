import { ApiError } from './error';
import type { ProblemDetail } from '../types';
import { getToken, clearToken } from '@/utils/api';
import { getApiBaseUrlOrThrow } from '@/utils/apiConfig';

/**
 * Admin REST client.
 *
 * Auth + base URL come from the editor's shared utilities:
 *   - getToken()              → in-memory bearer (ADR-0004)
 *   - getApiBaseUrlOrThrow()  → runtime-configurable backend URL
 *
 * Paths are passed as `/admin/...` (no host) and prefixed with the base URL
 * at request time. On 401 we clear the shared token; editor screens listening
 * for `auth:logout` events bounce back to LoginScreen automatically.
 */

export function getBearer(): string | null {
  return getToken();
}

export function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function notifyUnauthorized() {
  clearToken();
}

/** Absolute URL for an admin path. Pass paths like `/admin/feed?after=0`. */
export function absoluteUrl(path: string): string {
  const base = getApiBaseUrlOrThrow().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = absoluteUrl(path);
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseProblem(res: Response): Promise<ProblemDetail> {
  try {
    const data = (await res.json()) as Partial<ProblemDetail>;
    return {
      ...data,
      type: data.type ?? 'about:blank',
      title: data.title ?? res.statusText ?? `HTTP ${res.status}`,
      status: data.status ?? res.status,
    };
  } catch {
    return {
      type: 'about:blank',
      title: res.statusText || `HTTP ${res.status}`,
      status: res.status,
    };
  }
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeader(),
    ...(opts.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
    signal: opts.signal,
    credentials: 'omit',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const problem = await parseProblem(res);
    if (problem.status === 401) {
      notifyUnauthorized();
    }
    throw new ApiError(problem);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T,>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T,>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
