import { useCallback, useState } from 'react';
import type { World } from '../types';
import { authFetch } from '../utils/api';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export interface CreateWorldInput {
  name: string;
  node_count: number;
  node_size: number;
}

export interface WorldsApi {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  list: () => Promise<World[]>;
  get: (id: number) => Promise<World>;
  create: (input: CreateWorldInput) => Promise<World>;
}

export function useWorldsApi(): WorldsApi {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const list = useCallback(async (): Promise<World[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/worlds`);
      if (!res.ok) throw new Error(`List worlds failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as World[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error listing worlds';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: number): Promise<World> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/worlds/${id}`);
      if (!res.ok) throw new Error(`Get world failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as World;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error getting world';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: CreateWorldInput): Promise<World> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/worlds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Create world failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as World;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error creating world';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, clearError, list, get, create };
}
