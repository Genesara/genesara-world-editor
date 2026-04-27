/**
 * Runtime-configurable backend URL. localStorage is the source of truth so a
 * single static build (e.g. on GitHub Pages) can target any user's self-hosted
 * backend. The Vite env var is used only as a build-time default suggestion.
 */

const LS_KEY = 'agentic-rpg:api-base-url';
export const API_BASE_URL_CHANGED_EVENT = 'config:base-url-changed';

const RAW_ENV_DEFAULT: string | undefined = import.meta.env.VITE_API_BASE_URL;
const ENV_DEFAULT: string | undefined =
  RAW_ENV_DEFAULT && RAW_ENV_DEFAULT.trim().length > 0
    ? RAW_ENV_DEFAULT.trim().replace(/\/+$/, '')
    : undefined;

function readStored(): string | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw == null) return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string | null {
  return readStored() ?? ENV_DEFAULT ?? null;
}

export function hasApiBaseUrl(): boolean {
  return getApiBaseUrl() != null;
}

export function getApiBaseUrlOrThrow(): string {
  const url = getApiBaseUrl();
  if (!url) {
    throw new Error('Backend URL is not configured. Open Settings to set one.');
  }
  return url;
}

export function getDefaultBaseUrlSuggestion(): string {
  return ENV_DEFAULT ?? 'http://localhost:8080';
}

/**
 * Validates and persists a backend URL. Throws on invalid input. Strips a
 * trailing slash so callers can concatenate paths without doubling it.
 */
export function setApiBaseUrl(rawUrl: string): void {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error('Backend URL is required');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Backend URL must be a valid URL (e.g. https://example.com)');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Backend URL must use http:// or https://');
  }
  const normalized = trimmed.replace(/\/+$/, '');
  localStorage.setItem(LS_KEY, normalized);
  window.dispatchEvent(new Event(API_BASE_URL_CHANGED_EVENT));
}

export function clearApiBaseUrl(): void {
  localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new Event(API_BASE_URL_CHANGED_EVENT));
}
