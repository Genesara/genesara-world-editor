import type { NodeKey } from '../types';

export const keyOf = (q: number, r: number): NodeKey => `${q},${r}`;

export const parseKey = (k: NodeKey): { q: number; r: number } => {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
};
