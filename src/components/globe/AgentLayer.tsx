import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { GlobeNode } from '../../types';

interface Props {
  nodes: Map<number, GlobeNode>;
  /** sphereIndex → list of agentIds currently on that face */
  positions: Map<number, string[]>;
  onAgentClick?: (agentId: string) => void;
}

const MARKER_OFFSET = 0.025;

/**
 * Operator overlay: an HTML badge over every sphere face that contains at
 * least one agent. Click opens the AgentInspector. Solo faces show a small
 * dot; clusters show a count.
 */
export function AgentLayer({ nodes, positions, onAgentClick }: Props) {
  const entries = useMemo(
    () =>
      Array.from(positions.entries())
        .map(([face, agents]) => ({ face, agents, node: nodes.get(face) }))
        .filter((e): e is { face: number; agents: string[]; node: GlobeNode } => !!e.node),
    [nodes, positions],
  );

  if (entries.length === 0) return null;

  return (
    <group>
      {entries.map((e) => {
        const c = e.node.centroid;
        const m = Math.hypot(c.x, c.y, c.z) || 1;
        const k = (m + MARKER_OFFSET) / m;
        const cluster = e.agents.length > 1;
        return (
          <Html
            key={e.face}
            position={[c.x * k, c.y * k, c.z * k]}
            center
            distanceFactor={2}
            zIndexRange={[10, 0]}
            occlude={false}
          >
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                if (onAgentClick && e.agents[0]) onAgentClick(e.agents[0]);
              }}
              style={cluster ? badgeStyle : dotStyle}
              title={
                cluster
                  ? `${e.agents.length} agents on face ${e.face}`
                  : `Agent ${e.agents[0].slice(0, 8)} on face ${e.face}`
              }
            >
              {cluster ? e.agents.length : ''}
            </button>
          </Html>
        );
      })}
    </group>
  );
}

const baseStyle: React.CSSProperties = {
  background: '#c8a35e',
  color: '#0e0f12',
  border: '1px solid #c8a35e',
  cursor: 'pointer',
  pointerEvents: 'auto',
  fontFamily: 'var(--mono)',
  fontWeight: 600,
  fontSize: 9,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
};

const dotStyle: React.CSSProperties = {
  ...baseStyle,
  width: 8,
  height: 8,
  borderRadius: '50%',
  padding: 0,
};

const badgeStyle: React.CSSProperties = {
  ...baseStyle,
  minWidth: 16,
  height: 16,
  borderRadius: 9999,
  padding: '0 4px',
};
