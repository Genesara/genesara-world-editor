/**
 * Derives per-face overlay data from the global live feed and the NPC zones API.
 *
 * Agent presence: tracks `agent.spawned` and `agent.moved` events to record each
 * agent's last known node. Presence count per node is the number of distinct agents
 * whose last event targeted that node.
 *
 * Building density (v1): derived from `environment.building_admin_edited` events
 * (removed:false) plus `agent.spawned` as an activity proxy.
 * This is NOT authoritative — it reflects feed activity seen since page load.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGlobalFeed } from '@/lib/feed/GlobalFeedContext';
import { worldsApi } from '@/lib/api/worlds';
import type { NpcZone } from '@/lib/api/worlds';
import type { NodeId } from '@/lib/types';

export interface OverlayData {
  /** nodeId → count of agents last seen there */
  agentPresence: Map<NodeId, number>;
  /** nodeId → density score (0..1, feed-derived, not authoritative) */
  buildingDensity: Map<NodeId, number>;
  /** NPC zones for this world */
  zones: NpcZone[];
  zonesLoading: boolean;
  totalAgents: number;
}

export function useGlobeOverlays(worldId: number): OverlayData {
  const { events } = useGlobalFeed();

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['npc-zones', worldId],
    queryFn: () => worldsApi.listNpcZones(worldId),
    staleTime: 30_000,
  });

  // Derive agent presence: latest node per agent UUID
  const agentPresence = useMemo<Map<NodeId, number>>(() => {
    const lastNode = new Map<string, NodeId>();
    for (const env of events) {
      if (!env.agent || env.node === null || env.node === undefined) continue;
      if (env.type === 'agent.spawned' || env.type === 'agent.moved') {
        lastNode.set(env.agent, env.node);
      }
    }
    const counts = new Map<NodeId, number>();
    for (const nodeId of lastNode.values()) {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  // v1 building density: count building_admin_edited (removed:false) + agent.spawned per node
  // Not authoritative — comment retained per spec.
  const buildingDensity = useMemo<Map<NodeId, number>>(() => {
    const raw = new Map<NodeId, number>();
    for (const env of events) {
      if (env.node === null || env.node === undefined) continue;
      if (env.type === 'environment.building_admin_edited') {
        const payload = env.payload as Record<string, unknown> | null;
        if (payload && payload['removed'] === false) {
          raw.set(env.node, (raw.get(env.node) ?? 0) + 1);
        }
      } else if (env.type === 'agent.spawned') {
        // Use spawned events as a lightweight activity proxy for density
        raw.set(env.node, (raw.get(env.node) ?? 0) + 0.25);
      }
    }
    // Normalise to 0..1
    if (raw.size === 0) return raw;
    const max = Math.max(...raw.values());
    if (max === 0) return raw;
    const normalised = new Map<NodeId, number>();
    for (const [k, v] of raw) {
      normalised.set(k, v / max);
    }
    return normalised;
  }, [events]);

  const totalAgents = useMemo(() => {
    const seen = new Set<string>();
    for (const env of events) {
      if (env.agent && (env.type === 'agent.spawned' || env.type === 'agent.moved')) {
        seen.add(env.agent);
      }
    }
    return seen.size;
  }, [events]);

  return { agentPresence, buildingDensity, zones, zonesLoading, totalAgents };
}
