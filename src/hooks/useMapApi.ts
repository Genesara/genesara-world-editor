import { useCallback, useMemo, useState } from 'react';
import type { Node } from '../types';
import { authFetch } from '../utils/api';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

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

  const url = useMemo(() => {
    return `${BASE_URL}/api/worlds/${scope.worldId}/nodes/${scope.sphereIndex}/hexes`;
  }, [scope.worldId, scope.sphereIndex]);

  const loadUrl = useMemo(() => {
    const radius = scope.initialRadius;
    if (radius == null) return url;
    return `${url}?radius=${radius}`;
  }, [url, scope.initialRadius]);

  const clearError = useCallback(() => setError(null), []);

  const load = useCallback(async (): Promise<Node[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(loadUrl);
      if (!res.ok) throw new Error(`Load failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as Node[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading map';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUrl]);

  const save = useCallback(
    async (nodes: Node[]): Promise<{ updated: number }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(url, {
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
    [url],
  );

  return { loading, error, clearError, load, save };
}
