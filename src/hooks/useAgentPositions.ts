import { useEffect, useState } from 'react';
import { useGlobalFeed } from '@/lib/runtime/feed/GlobalFeedContext';
import type { Uuid, NodeId } from '@/lib/runtime/types';

/**
 * Derives a (sphereIndex → agentIds) map from the live feed. Each agent.*
 * event with a `node` updates that agent's last known position; spawn events
 * register a position, despawn/death events remove it. No backend list
 * endpoint required — the feed is the source of truth.
 *
 * `sphereIndexLookup` translates the persisted GlobeNode.id (what the feed
 * uses) to the sphere face index the globe mesh draws against.
 */
export function useAgentPositions(
  sphereIndexLookup: (nodeId: NodeId) => number | null,
): Map<number, Uuid[]> {
  const { events } = useGlobalFeed();
  const [byFace, setByFace] = useState<Map<number, Uuid[]>>(() => new Map());

  useEffect(() => {
    if (events.length === 0) return;
    const lastByAgent = new Map<Uuid, number | null>();
    for (const env of events) {
      if (!env.agent) continue;
      if (env.type.endsWith('.despawn') || env.type.endsWith('.death')) {
        lastByAgent.set(env.agent, null);
        continue;
      }
      if (env.node == null) continue;
      const face = sphereIndexLookup(env.node);
      if (face == null) continue;
      lastByAgent.set(env.agent, face);
    }
    const grouped = new Map<number, Uuid[]>();
    for (const [agent, face] of lastByAgent) {
      if (face == null) continue;
      const arr = grouped.get(face);
      if (arr) arr.push(agent);
      else grouped.set(face, [agent]);
    }
    setByFace(grouped);
  }, [events, sphereIndexLookup]);

  return byFace;
}
