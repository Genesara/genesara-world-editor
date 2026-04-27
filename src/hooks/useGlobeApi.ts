import { useCallback, useState } from 'react';
import type { Biome, ClimateType, GlobeNode, Vec3 } from '../types';
import { authFetch } from '../utils/api';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export interface CreateNodeInput {
  sphere_index: number;
  biome: Biome;
  climate: ClimateType;
  face_vertices?: Vec3[];
  centroid?: Vec3;
  neighbor_indices?: number[];
}

export interface UpdateNodeInput {
  biome?: Biome | null;
  climate?: ClimateType | null;
}

export interface GlobeApi {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  list: (worldId: number) => Promise<GlobeNode[]>;
  get: (worldId: number, sphereIndex: number) => Promise<GlobeNode>;
  create: (worldId: number, input: CreateNodeInput) => Promise<GlobeNode>;
  update: (
    worldId: number,
    sphereIndex: number,
    patch: UpdateNodeInput,
  ) => Promise<GlobeNode>;
  clear: (worldId: number, sphereIndex: number) => Promise<GlobeNode>;
}

export function useGlobeApi(): GlobeApi {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const list = useCallback(async (worldId: number): Promise<GlobeNode[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/worlds/${worldId}/nodes`);
      if (!res.ok) {
        throw new Error(`List globe nodes failed: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as GlobeNode[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error listing globe nodes';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(
    async (worldId: number, sphereIndex: number): Promise<GlobeNode> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${BASE_URL}/api/worlds/${worldId}/nodes/${sphereIndex}`);
        if (!res.ok) {
          throw new Error(`Get globe node failed: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as GlobeNode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error getting globe node';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const create = useCallback(
    async (worldId: number, input: CreateNodeInput): Promise<GlobeNode> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`${BASE_URL}/api/worlds/${worldId}/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          throw new Error(`Create globe node failed: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as GlobeNode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error creating globe node';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const update = useCallback(
    async (
      worldId: number,
      sphereIndex: number,
      patch: UpdateNodeInput,
    ): Promise<GlobeNode> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${BASE_URL}/api/worlds/${worldId}/nodes/${sphereIndex}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          },
        );
        if (!res.ok) {
          throw new Error(`Update globe node failed: ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as GlobeNode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error updating globe node';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clear = useCallback(
    (worldId: number, sphereIndex: number): Promise<GlobeNode> =>
      update(worldId, sphereIndex, { biome: null, climate: null }),
    [update],
  );

  return { loading, error, clearError, list, get, create, update, clear };
}
