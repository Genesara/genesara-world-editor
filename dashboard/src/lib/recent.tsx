import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { NodeId, Uuid } from './types';

interface RecentState {
  agents: Uuid[];
  nodes: NodeId[];
  pushAgent: (id: Uuid) => void;
  pushNode: (id: NodeId) => void;
}

const RecentContext = createContext<RecentState | null>(null);

const RECENT_LIMIT = 8;

function pushUnique<T>(list: T[], value: T): T[] {
  const filtered = list.filter((v) => v !== value);
  return [value, ...filtered].slice(0, RECENT_LIMIT);
}

export function RecentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Uuid[]>([]);
  const [nodes, setNodes] = useState<NodeId[]>([]);

  const pushAgent = useCallback((id: Uuid) => {
    if (!id) return;
    setAgents((prev) => pushUnique(prev, id));
  }, []);
  const pushNode = useCallback((id: NodeId) => {
    if (!Number.isFinite(id)) return;
    setNodes((prev) => pushUnique(prev, id));
  }, []);

  const value = useMemo(() => ({ agents, nodes, pushAgent, pushNode }), [agents, nodes, pushAgent, pushNode]);

  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

export function useRecent(): RecentState {
  const ctx = useContext(RecentContext);
  if (!ctx) throw new Error('useRecent must be used inside <RecentProvider>');
  return ctx;
}
