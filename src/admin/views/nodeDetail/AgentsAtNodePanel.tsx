import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { useRecent } from '@/admin/lib/recent';
import { Card, CardSection } from '@/admin/components/ui/Card';
import { Button } from '@/admin/components/ui/Button';
import { Empty } from '@/admin/components/ui/Empty';
import type { NodeId, Uuid } from '@/admin/lib/types';

interface AgentAtNode {
  agentId: Uuid;
  lastSeenTick: number;
}

interface Props {
  nodeId: NodeId;
}

export function AgentsAtNodePanel({ nodeId }: Props) {
  const { events } = useGlobalFeed();
  const { pushAgent } = useRecent();
  const navigate = useNavigate();

  // Derive agents currently at this node by tracking last-known position per agent.
  // We scan all feed events where node matches and type is agent.spawned or agent.moved.
  const agents = useMemo<AgentAtNode[]>(() => {
    const lastPosition = new Map<Uuid, { nodeId: NodeId; tick: number }>();

    for (const env of events) {
      const agentId = env.agent;
      if (!agentId) continue;

      const isPositionEvent =
        env.type === 'agent.spawned' ||
        env.type === 'agent.moved' ||
        env.type.startsWith('agent.spawned') ||
        env.type.startsWith('agent.moved');

      if (!isPositionEvent) continue;

      const envNode = env.node;
      if (envNode === null || envNode === undefined) continue;

      const current = lastPosition.get(agentId);
      if (!current || env.tick >= current.tick) {
        lastPosition.set(agentId, { nodeId: envNode, tick: env.tick });
      }
    }

    const result: AgentAtNode[] = [];
    for (const [agentId, pos] of lastPosition.entries()) {
      if (pos.nodeId === nodeId) {
        result.push({ agentId, lastSeenTick: pos.tick });
      }
    }
    return result.sort((a, b) => b.lastSeenTick - a.lastSeenTick);
  }, [events, nodeId]);

  function handleAgentClick(agentId: Uuid) {
    pushAgent(agentId);
    navigate(`/agents/${agentId}`);
  }

  return (
    <Card>
      <CardSection title="Agents at node">
        {agents.length === 0 ? (
          <Empty title="No agents tracked at this node" hint="Position events appear here as they stream in." />
        ) : (
          <div className="flex flex-col gap-1">
            {agents.map((a) => (
              <div
                key={a.agentId}
                className="surface-2 flex items-center justify-between px-3 py-2 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="mono text-fg-default truncate">{a.agentId}</div>
                  <div className="text-2xs text-fg-muted mt-0.5">
                    tick <span className="mono">{a.lastSeenTick}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAgentClick(a.agentId)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </Card>
  );
}
