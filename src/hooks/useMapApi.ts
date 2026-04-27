import { useCallback, useState } from 'react';
import type { Node } from '../types';
import { authFetch } from '../utils/api';
import { getApiBaseUrlOrThrow } from '../utils/apiConfig';

export interface MapApiScope {
  worldId: number;
  sphereIndex: number;
  initialRadius?: number;
}

export interface MapApi {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  load: () => Promise<Node[]>;
  save: (nodes: Node[]) => Promise<{ updated: number }>;
}

export function useMapApi(scope: MapApiScope): MapApi {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback(() => {
    return `${getApiBaseUrlOrThrow()}/api/worlds/${scope.worldId}/nodes/${scope.sphereIndex}/hexes`;
  }, [scope.worldId, scope.sphereIndex]);

  const clearError = useCallback(() => setError(null), []);

  const load = useCallback(async (): Promise<Node[]> => {
    setLoading(true);
    setError(null);
    try {
      const base = buildUrl();
      const radius = scope.initialRadius;
      const target = radius == null ? base : `${base}?radius=${radius}`;
      const res = await authFetch(target);
      if (!res.ok) throw new Error(`Load failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as Node[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading map';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buildUrl, scope.initialRadius]);

  const save = useCallback(
    async (nodes: Node[]): Promise<{ updated: number }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(buildUrl(), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status} ${res.statusText}`);
        return (await res.json()) as { updated: number };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error saving map';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildUrl],
  );

  return { loading, error, clearError, load, save };
}
