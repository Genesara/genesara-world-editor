import type {
  EquipmentInstance,
  GlobeNode,
  ItemCatalogEntry,
  Node,
  StarterNode,
  World,
} from '../types';

const PREFIX = 'genesara';
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
const TICK_KEY = k('counters-tick');
const CATALOG_KEY = k('catalog');
const AGENTS_KEY = k('agents');

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

export function nextTick(): number {
  const cur = readJSON<number>(TICK_KEY, 0);
  const next = cur + 1;
  writeJSON(TICK_KEY, next);
  return next;
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

/**
 * Locate a hex tile by its db id across all globe nodes in a world. Used by the
 * starter-nodes PUT handler to validate `nodeId` and check the tile's terrain.
 */
export function findHexInWorld(
  worldId: number,
  hexId: number,
): { tile: Node; sphereIndex: number } | null {
  const globeNodes = getGlobeNodes(worldId);
  for (const gn of globeNodes) {
    const hexes = getHexes(worldId, gn.sphere_index) ?? [];
    const hit = hexes.find((h) => h.id === hexId);
    if (hit) return { tile: hit, sphereIndex: gn.sphere_index };
  }
  return null;
}

// ---- Starter nodes (per world) ----

export function getStarterNodes(worldId: number): StarterNode[] {
  return readJSON<StarterNode[]>(k('world', worldId, 'starter-nodes'), []);
}

export function saveStarterNodes(worldId: number, list: StarterNode[]): void {
  writeJSON(k('world', worldId, 'starter-nodes'), list);
}

export function getStarterNode(worldId: number, raceId: string): StarterNode | null {
  return getStarterNodes(worldId).find((s) => s.raceId === raceId) ?? null;
}

export function setStarterNode(worldId: number, raceId: string, nodeId: number): StarterNode {
  const list = getStarterNodes(worldId);
  const next: StarterNode = { raceId, nodeId };
  const idx = list.findIndex((s) => s.raceId === raceId);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveStarterNodes(worldId, list);
  return next;
}

export function deleteStarterNode(worldId: number, raceId: string): boolean {
  const list = getStarterNodes(worldId);
  const idx = list.findIndex((s) => s.raceId === raceId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  saveStarterNodes(worldId, list);
  return true;
}

// ---- Item catalog (global) ----

export function getItemCatalog(): ItemCatalogEntry[] {
  return readJSON<ItemCatalogEntry[]>(CATALOG_KEY, []);
}

export function saveItemCatalog(entries: ItemCatalogEntry[]): void {
  writeJSON(CATALOG_KEY, entries);
}

export function getItem(itemId: string): ItemCatalogEntry | null {
  return getItemCatalog().find((e) => e.itemId === itemId) ?? null;
}

// ---- Agent registry (global) ----

export function getRegisteredAgents(): string[] {
  return readJSON<string[]>(AGENTS_KEY, []);
}

export function saveRegisteredAgents(ids: string[]): void {
  writeJSON(AGENTS_KEY, ids);
}

export function isAgentRegistered(agentId: string): boolean {
  return getRegisteredAgents().includes(agentId);
}

// ---- Agent equipment (per agent) ----

export function getAgentEquipment(agentId: string): EquipmentInstance[] {
  return readJSON<EquipmentInstance[]>(k('agent', agentId, 'equipment'), []);
}

export function appendAgentEquipment(agentId: string, instance: EquipmentInstance): void {
  const list = getAgentEquipment(agentId);
  list.push(instance);
  writeJSON(k('agent', agentId, 'equipment'), list);
}

export function resetAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${PREFIX}:`)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}
