import { useCallback, useState } from 'react';
import type { Node } from '../types';
import { keyOf } from '../utils/keyOf';

export interface DirtyTracker {
  dirty: Map<string, Node>;
  markDirty: (node: Node) => void;
  markManyDirty: (nodes: Iterable<Node>) => void;
  clear: () => void;
  size: number;
}

export function useDirtyTracker(): DirtyTracker {
  const [dirty, setDirty] = useState<Map<string, Node>>(() => new Map());

  const markDirty = useCallback((node: Node) => {
    setDirty((prev) => {
      const next = new Map(prev);
      next.set(keyOf(node.q, node.r), node);
      return next;
    });
  }, []);

  const markManyDirty = useCallback((nodes: Iterable<Node>) => {
    setDirty((prev) => {
      const next = new Map(prev);
      for (const n of nodes) next.set(keyOf(n.q, n.r), n);
      return next;
    });
  }, []);

  const clear = useCallback(() => setDirty(new Map()), []);

  return { dirty, markDirty, markManyDirty, clear, size: dirty.size };
}
