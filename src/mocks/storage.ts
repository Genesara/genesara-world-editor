import type { GlobeNode, Node, World } from '../types';

const PREFIX = 'agentic-rpg';
const SCHEMA_VERSION = 2;

function k(...parts: (string | number)[]): string {
  return [PREFIX, `v${SCHEMA_VERSION}`, ...parts].join(':');
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[storage] write failed', key, err);
  }
}

const WORLDS_KEY = k('worlds');
const COUNTERS_KEY = k('counters');

interface Counters {
  world: number;
}

function readCounters(): Counters {
  return readJSON<Counters>(COUNTERS_KEY, { world: 0 });
}

function writeCounters(c: Counters): void {
  writeJSON(COUNTERS_KEY, c);
}

export function nextWorldId(): number {
  const c = readCounters();
  c.world += 1;
  writeCounters(c);
  return c.world;
}

export function listWorlds(): World[] {
  return readJSON<World[]>(WORLDS_KEY, []);
}

export function saveWorlds(worlds: World[]): void {
  writeJSON(WORLDS_KEY, worlds);
}

export function getWorld(id: number): World | null {
  return listWorlds().find((w) => w.id === id) ?? null;
}

export function getGlobeNodes(worldId: number): GlobeNode[] {
  return readJSON<GlobeNode[]>(k('world', worldId, 'globenodes'), []);
}

export function saveGlobeNodes(worldId: number, nodes: GlobeNode[]): void {
  writeJSON(k('world', worldId, 'globenodes'), nodes);
}

export function getGlobeNode(worldId: number, sphereIndex: number): GlobeNode | null {
  const nodes = getGlobeNodes(worldId);
  return nodes.find((n) => n.sphere_index === sphereIndex) ?? null;
}

export function getHexes(worldId: number, sphereIndex: number): Node[] | null {
  const key = k('world', worldId, 'node', sphereIndex, 'hexes');
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as Node[];
  } catch {
    return null;
  }
}

export function saveHexes(worldId: number, sphereIndex: number, nodes: Node[]): void {
  writeJSON(k('world', worldId, 'node', sphereIndex, 'hexes'), nodes);
}

export function resetAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${PREFIX}:`)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}
