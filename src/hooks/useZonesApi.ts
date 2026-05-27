import { useCallback, useEffect, useMemo, useState } from 'react';
import { worldsApi, type NpcZone } from '@/admin/lib/api/worlds';
import { ApiError } from '@/admin/lib/api/error';

const DEFAULT_WEIGHTS: Record<string, number> = { WOLF: 1.0 };

export interface ZoneDraft {
  /** sphere indices the user clicked while in CREATE mode */
  toCreate: Set<number>;
  /** sphere indices of existing zones the user clicked while in DELETE mode */
  toDelete: Set<number>;
}

export function useZonesApi(worldId: number) {
  const [zones, setZones] = useState<NpcZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    return worldsApi
      .listNpcZones(worldId)
      .then((list) => {
        setZones(list);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.detail ?? e.title : e instanceof Error ? e.message : 'Failed to load zones');
      })
      .finally(() => setLoading(false));
  }, [worldId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Submit a draft: creates a node-scoped zone per `toCreate` sphereIndex
   * (after looking up the persisted GlobeNode.id), and deletes the existing
   * zone for each `toDelete` sphereIndex.
   */
  const saveBatch = useCallback(
    async (
      draft: ZoneDraft,
      sphereIndexToNodeId: (s: number) => number | null,
      byNodeId: Map<number, NpcZone>,
      sphereIndexToZoneId: (s: number) => string | null,
    ) => {
      const creates = Array.from(draft.toCreate).map(async (sphereIndex) => {
        const nodeId = sphereIndexToNodeId(sphereIndex);
        if (nodeId == null) return null;
        if (byNodeId.has(nodeId)) return null; // skip if a zone already exists
        return worldsApi.createNpcZone(worldId, {
          scope: 'NODE',
          nodeId,
          weights: DEFAULT_WEIGHTS,
          maxConcurrent: 5,
          active: true,
        });
      });
      const deletes = Array.from(draft.toDelete)
        .map((sphereIndex) => sphereIndexToZoneId(sphereIndex))
        .filter((id): id is string => !!id)
        .map((zoneId) => worldsApi.deleteNpcZone(worldId, zoneId));
      await Promise.all([...creates, ...deletes]);
      await refresh();
    },
    [worldId, refresh],
  );

  /** Index zones by their nodeId for fast lookup on the globe. */
  const byNodeId = useMemo(() => {
    const m = new Map<number, NpcZone>();
    for (const z of zones) {
      if (z.scope === 'NODE' && z.nodeId != null) m.set(z.nodeId, z);
    }
    return m;
  }, [zones]);

  return { zones, byNodeId, loading, error, refresh, saveBatch };
}
