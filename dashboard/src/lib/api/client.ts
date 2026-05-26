import { ApiError } from './error';
import type { ProblemDetail } from '../types';

export type TokenProvider = () => string | null;
export type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => undefined;

export function configureApi(opts: { token: TokenProvider; onUnauthorized: UnauthorizedHandler }) {
  tokenProvider = opts.token;
  onUnauthorized = opts.onUnauthorized;
}

export function getBearer(): string | null {
  return tokenProvider();
}

export function authHeader(): Record<string, string> {
  const t = tokenProvider();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function notifyUnauthorized() {
  onUnauthorized();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
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
