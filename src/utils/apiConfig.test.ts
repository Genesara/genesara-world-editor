import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LS_KEY = 'genesara:api-base-url';

async function loadModule(envValue: string | undefined) {
  vi.resetModules();
  if (envValue === undefined) {
    vi.stubEnv('VITE_API_BASE_URL', '');
  } else {
    vi.stubEnv('VITE_API_BASE_URL', envValue);
  }
  return await import('./apiConfig');
}

describe('apiConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getApiBaseUrl', () => {
    it('returns null when nothing is stored and env is empty', async () => {
      const mod = await loadModule(undefined);
      expect(mod.getApiBaseUrl()).toBeNull();
      expect(mod.hasApiBaseUrl()).toBe(false);
    });

    it('falls back to env default when nothing is stored', async () => {
      const mod = await loadModule('http://env-default.test');
      expect(mod.getApiBaseUrl()).toBe('http://env-default.test');
      expect(mod.hasApiBaseUrl()).toBe(true);
    });

    it('treats empty/whitespace env as no default', async () => {
      const mod = await loadModule('   ');
      expect(mod.getApiBaseUrl()).toBeNull();
    });

    it('strips a trailing slash on the env default', async () => {
      const mod = await loadModule('http://env.test/');
      expect(mod.getApiBaseUrl()).toBe('http://env.test');
    });

    it('prefers stored value over env default', async () => {
      localStorage.setItem(LS_KEY, 'http://stored.test');
      const mod = await loadModule('http://env.test');
      expect(mod.getApiBaseUrl()).toBe('http://stored.test');
    });

    it('ignores blank stored values', async () => {
      localStorage.setItem(LS_KEY, '   ');
      const mod = await loadModule('http://env.test');
      expect(mod.getApiBaseUrl()).toBe('http://env.test');
    });
  });

  describe('getApiBaseUrlOrThrow', () => {
    it('returns the URL when configured', async () => {
      const mod = await loadModule('http://api.test');
      expect(mod.getApiBaseUrlOrThrow()).toBe('http://api.test');
    });

    it('throws a clear error when nothing is configured', async () => {
      const mod = await loadModule(undefined);
      expect(() => mod.getApiBaseUrlOrThrow()).toThrow(/not configured/i);
    });
  });

  describe('getDefaultBaseUrlSuggestion', () => {
    it('returns the env default when present', async () => {
      const mod = await loadModule('http://env.test');
      expect(mod.getDefaultBaseUrlSuggestion()).toBe('http://env.test');
    });

    it('returns localhost:8080 when no env default', async () => {
      const mod = await loadModule(undefined);
      expect(mod.getDefaultBaseUrlSuggestion()).toBe('http://localhost:8080');
    });
  });

  describe('setApiBaseUrl', () => {
    it('persists a valid http URL', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('http://api.example.com');
      expect(localStorage.getItem(LS_KEY)).toBe('http://api.example.com');
      expect(mod.getApiBaseUrl()).toBe('http://api.example.com');
    });

    it('persists a valid https URL', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('https://api.example.com');
      expect(localStorage.getItem(LS_KEY)).toBe('https://api.example.com');
    });

    it('strips a trailing slash before persisting', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('https://api.example.com/');
      expect(localStorage.getItem(LS_KEY)).toBe('https://api.example.com');
    });

    it('strips multiple trailing slashes', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('https://api.example.com///');
      expect(localStorage.getItem(LS_KEY)).toBe('https://api.example.com');
    });

    it('trims surrounding whitespace', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('   https://api.example.com   ');
      expect(localStorage.getItem(LS_KEY)).toBe('https://api.example.com');
    });

    it('rejects an empty string', async () => {
      const mod = await loadModule(undefined);
      expect(() => mod.setApiBaseUrl('')).toThrow(/required/i);
      expect(localStorage.getItem(LS_KEY)).toBeNull();
    });

    it('rejects whitespace-only input', async () => {
      const mod = await loadModule(undefined);
      expect(() => mod.setApiBaseUrl('   ')).toThrow(/required/i);
    });

    it('rejects an invalid URL', async () => {
      const mod = await loadModule(undefined);
      expect(() => mod.setApiBaseUrl('not a url')).toThrow(/valid url/i);
    });

    it('rejects a non-http(s) protocol', async () => {
      const mod = await loadModule(undefined);
      expect(() => mod.setApiBaseUrl('ftp://example.com')).toThrow(/http/);
      expect(() => mod.setApiBaseUrl('file:///tmp/x')).toThrow(/http/);
    });

    it('does not persist on validation failure', async () => {
      const mod = await loadModule(undefined);
      localStorage.setItem(LS_KEY, 'http://before.test');
      try {
        mod.setApiBaseUrl('ftp://nope');
      } catch {
        // expected
      }
      expect(localStorage.getItem(LS_KEY)).toBe('http://before.test');
    });

    it('dispatches a change event on success', async () => {
      const mod = await loadModule(undefined);
      const handler = vi.fn();
      window.addEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
      mod.setApiBaseUrl('https://api.example.com');
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
    });

    it('does not dispatch a change event on failure', async () => {
      const mod = await loadModule(undefined);
      const handler = vi.fn();
      window.addEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
      try {
        mod.setApiBaseUrl('ftp://nope');
      } catch {
        // expected
      }
      expect(handler).not.toHaveBeenCalled();
      window.removeEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
    });
  });

  describe('clearApiBaseUrl', () => {
    it('removes the stored value', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('https://api.example.com');
      mod.clearApiBaseUrl();
      expect(localStorage.getItem(LS_KEY)).toBeNull();
      expect(mod.getApiBaseUrl()).toBeNull();
    });

    it('falls back to env default after clearing', async () => {
      const mod = await loadModule('http://env.test');
      mod.setApiBaseUrl('https://override.test');
      expect(mod.getApiBaseUrl()).toBe('https://override.test');
      mod.clearApiBaseUrl();
      expect(mod.getApiBaseUrl()).toBe('http://env.test');
    });

    it('dispatches a change event', async () => {
      const mod = await loadModule(undefined);
      mod.setApiBaseUrl('https://api.example.com');
      const handler = vi.fn();
      window.addEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
      mod.clearApiBaseUrl();
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(mod.API_BASE_URL_CHANGED_EVENT, handler);
    });
  });
});
