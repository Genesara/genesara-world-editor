import { useCallback, useEffect, useMemo, useState } from 'react';
import { worldsApi, type NpcZone } from '@/lib/runtime/api/worlds';
import { ApiError } from '@/lib/runtime/api/error';

export interface ZoneCreateBody {
  weights: Record<string, number>;
  maxConcurrent: number;
  respawnTicks?: number;
  active: boolean;
}

export interface ZonePatchBody {
  weights?: Record<string, number>;
  maxConcurrent?: number;
  respawnTicks?: number;
  active?: boolean;
}

/**
 * World-scoped zone list with helpers focused on a single node — the natural
 * unit for the in-editor zone panel. Zones are server-paginated via list
 * (small enough that we just refetch after each mutation).
 */
export function useZonesApi(worldId: number) {
  const [zones, setZones] = useState<NpcZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageOf = (e: unknown): string =>
    e instanceof ApiError
      ? e.detail ?? e.title
      : e instanceof Error
        ? e.message
        : 'Zone request failed';

  const refresh = useCallback(() => {
    setLoading(true);
    return worldsApi
      .listNpcZones(worldId)
      .then((list) => {
        setZones(list);
        setError(null);
      })
      .catch((e) => setError(messageOf(e)))
      .finally(() => setLoading(false));
  }, [worldId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (nodeId: number, body: ZoneCreateBody): Promise<NpcZone> => {
      const created = await worldsApi.createNpcZone(worldId, {
        scope: 'NODE',
        nodeId,
        weights: body.weights,
        maxConcurrent: body.maxConcurrent,
        respawnTicks: body.respawnTicks,
        active: body.active,
      });
      await refresh();
      return created;
    },
    [worldId, refresh],
  );

  const patch = useCallback(
    async (zoneId: string, body: ZonePatchBody): Promise<NpcZone> => {
      const updated = await worldsApi.patchNpcZone(worldId, zoneId, body);
      await refresh();
      return updated;
    },
    [worldId, refresh],
  );

  const remove = useCallback(
    async (zoneId: string): Promise<void> => {
      await worldsApi.deleteNpcZone(worldId, zoneId);
      await refresh();
    },
    [worldId, refresh],
  );

  /** All zones currently attached to a specific node (a node can host many). */
  const forNode = useCallback(
    (nodeId: number | undefined): NpcZone[] => {
      if (nodeId == null) return [];
      return zones.filter((z) => z.scope === 'NODE' && z.nodeId === nodeId);
    },
    [zones],
  );

  /** Fast lookup of "does this nodeId have any zone?" — used by the globe overlay. */
  const nodeIdsWithZone = useMemo(() => {
    const s = new Set<number>();
    for (const z of zones) {
      if (z.scope === 'NODE' && z.nodeId != null) s.add(z.nodeId);
    }
    return s;
  }, [zones]);

  return { zones, loading, error, refresh, create, patch, remove, forNode, nodeIdsWithZone };
}
