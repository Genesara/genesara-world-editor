import { useCallback, useState } from 'react';
import type { RaceId, StarterNode } from '../types';
import { authFetch } from '../utils/api';
import { getApiBaseUrlOrThrow } from '../utils/apiConfig';

export interface StarterNodesApi {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  list: (worldId: number) => Promise<StarterNode[]>;
  set: (worldId: number, raceId: RaceId, nodeId: number) => Promise<StarterNode>;
  remove: (worldId: number, raceId: RaceId) => Promise<void>;
}

export function useStarterNodesApi(): StarterNodesApi {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const list = useCallback(async (worldId: number): Promise<StarterNode[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `${getApiBaseUrlOrThrow()}/api/worlds/${worldId}/starter-nodes`,
      );
      if (!res.ok) {
        throw new Error(`List starter nodes failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as StarterNode[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error listing starter nodes';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const set = useCallback(
    async (worldId: number, raceId: RaceId, nodeId: number): Promise<StarterNode> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${getApiBaseUrlOrThrow()}/api/worlds/${worldId}/starter-nodes/${encodeURIComponent(raceId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId }),
          },
        );
        if (!res.ok) {
          throw new Error(`Set starter node failed: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as StarterNode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error setting starter node';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const remove = useCallback(
    async (worldId: number, raceId: RaceId): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${getApiBaseUrlOrThrow()}/api/worlds/${worldId}/starter-nodes/${encodeURIComponent(raceId)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) {
          throw new Error(`Delete starter node failed: ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error deleting starter node';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, clearError, list, set, remove };
}
