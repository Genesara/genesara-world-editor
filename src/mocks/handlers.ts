import { http, HttpResponse } from 'msw';
import type {
  Biome,
  ClimateType,
  EquipmentInstance,
  GlobeNode,
  Node,
  Rarity,
  Vec3,
} from '../types';
import {
  isBiome,
  isClimate,
  isKnownRace,
  isRarity,
  isTerrain,
  isUuid,
  NON_TRAVERSABLE_TERRAINS,
  normalizeRaceId,
} from '../utils/enums';
import { keyOf } from '../utils/keyOf';
import { problemResponse } from '../utils/problemDetail';
import { bootstrapMockCatalogs } from './catalogs';
import { buildWorldWithNodes, seedHexesForGlobeNode } from './seed';
import {
  appendAgentEquipment,
  deleteStarterNode,
  findHexInWorld,
  getGlobeNode,
  getGlobeNodes,
  getHexes,
  getItem,
  getStarterNodes,
  getWorld,
  isAgentRegistered,
  listWorlds,
  nextTick,
  nextWorldId,
  saveGlobeNodes,
  saveHexes,
  saveWorlds,
  setStarterNode,
} from './storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

interface CreateWorldBody {
  name: string;
  node_count: number;
  node_size: number;
}

interface PatchHexesBody {
  nodes: Node[];
}

interface CreateGlobeNodeBody {
  sphere_index: number;
  biome: Biome;
  climate: ClimateType;
  face_vertices?: Vec3[];
  centroid?: Vec3;
  neighbor_indices?: number[];
}

interface PatchGlobeNodeBody {
  biome?: Biome | null;
  climate?: ClimateType | null;
}

interface PutStarterNodeBody {
  nodeId: number;
}

interface SeedEquipmentBody {
  itemId: string;
  rarity?: Rarity;
  durabilityCurrent?: number;
  creatorAgentId?: string | null;
}

function ensureDemoWorld(): void {
  if (listWorlds().length > 0) return;
  const id = nextWorldId();
  const { world, globeNodes } = buildWorldWithNodes({
    id,
    name: 'Demo',
    node_count: 92,
    node_size: 20,
  });
  saveWorlds([world]);
  saveGlobeNodes(id, globeNodes);
}

ensureDemoWorld();
bootstrapMockCatalogs();

// Bootstrap admin for the in-browser mock backend. Matches the production
// contract: HTTP Basic auth → bearer token. Real deployments configure these
// via ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD on the server.
const MOCK_ADMIN_USERNAME = 'admin';
const MOCK_ADMIN_PASSWORD = 'secret';
const MOCK_ADMIN_TOKEN = 'mock-admin-bearer-token';

export const handlers = [
  // ---- Auth ----
  http.post(`${BASE_URL}/admin/login`, ({ request }) => {
    const auth = request.headers.get('authorization') ?? '';
    if (!auth.toLowerCase().startsWith('basic ')) {
      return problemResponse(401, 'Unauthorized', 'Missing Basic auth header', request);
    }
    let decoded: string;
    try {
      decoded = atob(auth.slice(6).trim());
    } catch {
      return problemResponse(401, 'Unauthorized', 'Malformed credentials', request);
    }
    const sep = decoded.indexOf(':');
    const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const pass = sep >= 0 ? decoded.slice(sep + 1) : '';
    if (user !== MOCK_ADMIN_USERNAME || pass !== MOCK_ADMIN_PASSWORD) {
      return problemResponse(401, 'Unauthorized', 'Invalid credentials', request);
    }
    return HttpResponse.json({ token: MOCK_ADMIN_TOKEN });
  }),

  // ---- Worlds ----
  http.get(`${BASE_URL}/api/worlds`, () => {
    return HttpResponse.json(listWorlds());
  }),

  http.post(`${BASE_URL}/api/worlds`, async ({ request }) => {
    let body: CreateWorldBody;
    try {
      body = (await request.json()) as CreateWorldBody;
    } catch {
      return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
    }
    const errors: string[] = [];
    if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('name: must not be blank');
    }
    if (!body || !Number.isFinite(body.node_count) || body.node_count <= 0) {
      errors.push('nodeCount: must be greater than 0');
    }
    if (!body || !Number.isFinite(body.node_size) || body.node_size <= 0) {
      errors.push('nodeSize: must be greater than 0');
    }
    if (errors.length > 0) {
      return problemResponse(400, 'Bad Request', errors.join('; '), request);
    }
    const id = nextWorldId();
    const { world, globeNodes } = buildWorldWithNodes({
      id,
      name: body.name,
      node_count: body.node_count,
      node_size: body.node_size,
    });
    const current = listWorlds();
    current.push(world);
    saveWorlds(current);
    saveGlobeNodes(id, globeNodes);
    return HttpResponse.json(world, { status: 201 });
  }),

  http.get(`${BASE_URL}/api/worlds/:worldId`, ({ params, request }) => {
    const worldId = Number(params.worldId);
    const world = getWorld(worldId);
    if (!world) return problemResponse(404, 'Not Found', 'World not found', request);
    return HttpResponse.json(world);
  }),

  // ---- Globe nodes ----
  http.get(`${BASE_URL}/api/worlds/:worldId/nodes`, ({ params, request }) => {
    const worldId = Number(params.worldId);
    if (!getWorld(worldId)) {
      return problemResponse(404, 'Not Found', 'World not found', request);
    }
    return HttpResponse.json(getGlobeNodes(worldId));
  }),

  http.post(`${BASE_URL}/api/worlds/:worldId/nodes`, async ({ params, request }) => {
    const worldId = Number(params.worldId);
    if (!getWorld(worldId)) {
      return problemResponse(404, 'Not Found', 'World not found', request);
    }
    let body: CreateGlobeNodeBody;
    try {
      body = (await request.json()) as CreateGlobeNodeBody;
    } catch {
      return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
    }
    const errors: string[] = [];
    if (!body || !Number.isFinite(body.sphere_index) || body.sphere_index < 0) {
      errors.push('sphere_index: must be ≥ 0');
    }
    if (!body || !isBiome(body.biome)) {
      errors.push('biome: must be a known Biome value');
    }
    if (!body || !isClimate(body.climate)) {
      errors.push('climate: must be a known Climate value');
    }
    if (errors.length > 0) {
      return problemResponse(400, 'Bad Request', errors.join('; '), request);
    }
    const existing = getGlobeNodes(worldId);
    const byIndex = new Map<number, GlobeNode>();
    for (const n of existing) byIndex.set(n.sphere_index, n);
    const prior = byIndex.get(body.sphere_index);
    if (!prior && (!body.face_vertices || !body.centroid || !body.neighbor_indices)) {
      return problemResponse(
        400,
        'Bad Request',
        'face_vertices, centroid, and neighbor_indices required for new face',
        request,
      );
    }
    const next: GlobeNode = {
      id: prior?.id,
      world_id: worldId,
      sphere_index: body.sphere_index,
      biome: body.biome,
      climate: body.climate,
      face_vertices: prior?.face_vertices ?? body.face_vertices!,
      centroid: prior?.centroid ?? body.centroid!,
      neighbor_indices: prior?.neighbor_indices ?? body.neighbor_indices!,
    };
    byIndex.set(body.sphere_index, next);
    const merged = Array.from(byIndex.values()).sort(
      (a, b) => a.sphere_index - b.sphere_index,
    );
    saveGlobeNodes(worldId, merged);
    return HttpResponse.json(next, { status: 201 });
  }),

  http.patch(
    `${BASE_URL}/api/worlds/:worldId/nodes/:sphereIndex`,
    async ({ params, request }) => {
      const worldId = Number(params.worldId);
      const sphereIndex = Number(params.sphereIndex);
      if (!getWorld(worldId)) {
        return problemResponse(404, 'Not Found', 'World not found', request);
      }
      const prior = getGlobeNode(worldId, sphereIndex);
      if (!prior) {
        return problemResponse(404, 'Not Found', 'Node not found', request);
      }
      let body: PatchGlobeNodeBody;
      try {
        body = (await request.json()) as PatchGlobeNodeBody;
      } catch {
        return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
      }
      // Tri-state validation: present + non-null must be a known enum value.
      if (body.biome !== undefined && body.biome !== null && !isBiome(body.biome)) {
        return problemResponse(400, 'Bad Request', 'biome: must be a known Biome value', request);
      }
      if (body.climate !== undefined && body.climate !== null && !isClimate(body.climate)) {
        return problemResponse(400, 'Bad Request', 'climate: must be a known Climate value', request);
      }
      const next: GlobeNode = {
        ...prior,
        biome: body.biome === undefined ? prior.biome : body.biome,
        climate: body.climate === undefined ? prior.climate : body.climate,
      };
      const all = getGlobeNodes(worldId).map((n) =>
        n.sphere_index === sphereIndex ? next : n,
      );
      saveGlobeNodes(worldId, all);
      return HttpResponse.json(next);
    },
  ),

  http.get(
    `${BASE_URL}/api/worlds/:worldId/nodes/:sphereIndex`,
    ({ params, request }) => {
      const worldId = Number(params.worldId);
      const sphereIndex = Number(params.sphereIndex);
      const node = getGlobeNode(worldId, sphereIndex);
      if (!node) return problemResponse(404, 'Not Found', 'Node not found', request);
      return HttpResponse.json(node);
    },
  ),

  // ---- Per-node hex grids ----
  http.get(
    `${BASE_URL}/api/worlds/:worldId/nodes/:sphereIndex/hexes`,
    ({ params, request }) => {
      const worldId = Number(params.worldId);
      const sphereIndex = Number(params.sphereIndex);
      const globeNode = getGlobeNode(worldId, sphereIndex);
      if (!globeNode) {
        return problemResponse(404, 'Not Found', 'Globe node not found', request);
      }
      const url = new URL(request.url);
      const radiusParam = url.searchParams.get('radius');
      const radius = radiusParam ? Math.max(1, Math.min(80, Number(radiusParam))) : 12;

      const stored = getHexes(worldId, sphereIndex);
      if (stored && stored.length > 0) {
        return HttpResponse.json(stored);
      }
      const seeded = seedHexesForGlobeNode(
        worldId,
        sphereIndex,
        radius,
        globeNode.biome ?? undefined,
      );
      saveHexes(worldId, sphereIndex, seeded);
      return HttpResponse.json(seeded);
    },
  ),

  http.patch(
    `${BASE_URL}/api/worlds/:worldId/nodes/:sphereIndex/hexes`,
    async ({ params, request }) => {
      const worldId = Number(params.worldId);
      const sphereIndex = Number(params.sphereIndex);
      if (!getGlobeNode(worldId, sphereIndex)) {
        return problemResponse(404, 'Not Found', 'Globe node not found', request);
      }
      let body: PatchHexesBody;
      try {
        body = (await request.json()) as PatchHexesBody;
      } catch {
        return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
      }
      if (!body || !Array.isArray(body.nodes) || body.nodes.length === 0) {
        return problemResponse(400, 'Bad Request', 'nodes: must not be empty', request);
      }
      for (const n of body.nodes) {
        if (!n || typeof n !== 'object') {
          return problemResponse(400, 'Bad Request', 'nodes: each entry must be an object', request);
        }
        if (!Number.isFinite(n.q) || !Number.isFinite(n.r)) {
          return problemResponse(400, 'Bad Request', 'nodes: q and r must be numbers', request);
        }
        if (!isTerrain(n.terrain)) {
          return problemResponse(
            400,
            'Bad Request',
            `terrain: "${String(n.terrain)}" is not a known Terrain value`,
            request,
          );
        }
      }
      const existing = getHexes(worldId, sphereIndex) ?? [];
      const byKey = new Map<string, Node>();
      for (const n of existing) byKey.set(keyOf(n.q, n.r), n);
      let nextId = existing.reduce((m, n) => Math.max(m, n.id ?? 0), 0) + 1;
      for (const n of body.nodes) {
        const k = keyOf(n.q, n.r);
        const prev = byKey.get(k);
        byKey.set(k, { ...n, id: prev?.id ?? n.id ?? nextId++ });
      }
      const merged = Array.from(byKey.values());
      saveHexes(worldId, sphereIndex, merged);
      return HttpResponse.json({ updated: body.nodes.length });
    },
  ),

  // ---- Starter nodes (race → spawn-node mapping) ----
  http.get(
    `${BASE_URL}/api/worlds/:worldId/starter-nodes`,
    ({ params, request }) => {
      const worldId = Number(params.worldId);
      if (!getWorld(worldId)) {
        return problemResponse(404, 'Not Found', 'World not found', request);
      }
      return HttpResponse.json(getStarterNodes(worldId));
    },
  ),

  http.put(
    `${BASE_URL}/api/worlds/:worldId/starter-nodes/:raceId`,
    async ({ params, request }) => {
      const worldId = Number(params.worldId);
      const raceIdRaw = String(params.raceId);
      const raceId = normalizeRaceId(raceIdRaw);
      if (!getWorld(worldId)) {
        return problemResponse(404, 'Not Found', 'World not found', request);
      }
      if (!isKnownRace(raceIdRaw)) {
        return problemResponse(400, 'Bad Request', `raceId: "${raceIdRaw}" is not a known race`, request);
      }
      let body: PutStarterNodeBody;
      try {
        body = (await request.json()) as PutStarterNodeBody;
      } catch {
        return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
      }
      if (!body || !Number.isFinite(body.nodeId) || body.nodeId <= 0) {
        return problemResponse(400, 'Bad Request', 'nodeId: must be greater than 0', request);
      }
      const hit = findHexInWorld(worldId, body.nodeId);
      if (!hit) {
        return problemResponse(
          404,
          'Not Found',
          `Hex tile ${body.nodeId} not found in world ${worldId}`,
          request,
        );
      }
      if (NON_TRAVERSABLE_TERRAINS.has(hit.tile.terrain)) {
        return problemResponse(
          400,
          'Bad Request',
          `nodeId: cannot place starter on non-traversable terrain (${hit.tile.terrain})`,
          request,
        );
      }
      const saved = setStarterNode(worldId, raceId, body.nodeId);
      return HttpResponse.json(saved);
    },
  ),

  http.delete(
    `${BASE_URL}/api/worlds/:worldId/starter-nodes/:raceId`,
    ({ params, request }) => {
      const worldId = Number(params.worldId);
      const raceId = normalizeRaceId(String(params.raceId));
      if (!getWorld(worldId)) {
        return problemResponse(404, 'Not Found', 'World not found', request);
      }
      const removed = deleteStarterNode(worldId, raceId);
      if (!removed) {
        return problemResponse(
          404,
          'Not Found',
          `No starter mapping for race "${raceId}"`,
          request,
        );
      }
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // ---- Equipment seeding ----
  http.post(
    `${BASE_URL}/admin/agents/:agentId/equipment`,
    async ({ params, request }) => {
      const agentId = String(params.agentId);
      if (!isUuid(agentId)) {
        return problemResponse(400, 'Bad Request', 'agentId: must be a valid UUID', request);
      }
      let body: SeedEquipmentBody;
      try {
        body = (await request.json()) as SeedEquipmentBody;
      } catch {
        return problemResponse(400, 'Bad Request', 'Invalid JSON body', request);
      }
      const errors: string[] = [];
      if (!body || typeof body.itemId !== 'string' || body.itemId.trim() === '') {
        errors.push('itemId: must not be blank');
      }
      if (body && body.rarity !== undefined && !isRarity(body.rarity)) {
        errors.push('rarity: must be a known Rarity value');
      }
      if (
        body &&
        body.durabilityCurrent !== undefined &&
        (!Number.isFinite(body.durabilityCurrent) || body.durabilityCurrent < 0)
      ) {
        errors.push('durabilityCurrent: must be ≥ 0');
      }
      if (body && body.creatorAgentId !== undefined && body.creatorAgentId !== null) {
        if (typeof body.creatorAgentId !== 'string' || body.creatorAgentId === '' || !isUuid(body.creatorAgentId)) {
          errors.push('creatorAgentId: must be a valid UUID, null, or omitted');
        }
      }
      if (errors.length > 0) {
        return problemResponse(400, 'Bad Request', errors.join('; '), request);
      }
      if (!isAgentRegistered(agentId)) {
        return problemResponse(404, 'Not Found', `Agent ${agentId} is not registered`, request);
      }
      const item = getItem(body.itemId);
      if (!item) {
        return problemResponse(404, 'Not Found', `Item "${body.itemId}" not in catalog`, request);
      }
      if (item.category !== 'EQUIPMENT') {
        return problemResponse(
          400,
          'Bad Request',
          `itemId: item "${item.itemId}" has category ${item.category}, expected EQUIPMENT`,
          request,
        );
      }
      if (item.maxDurability == null) {
        return problemResponse(
          400,
          'Bad Request',
          `itemId: item "${item.itemId}" has no maxDurability`,
          request,
        );
      }
      if (
        body.durabilityCurrent !== undefined &&
        body.durabilityCurrent > item.maxDurability
      ) {
        return problemResponse(
          400,
          'Bad Request',
          `durabilityCurrent: ${body.durabilityCurrent} exceeds maxDurability ${item.maxDurability}`,
          request,
        );
      }
      const instance: EquipmentInstance = {
        instanceId: crypto.randomUUID(),
        itemId: item.itemId,
        rarity: body.rarity ?? item.defaultRarity,
        durabilityCurrent: body.durabilityCurrent ?? item.maxDurability,
        durabilityMax: item.maxDurability,
        creatorAgentId: body.creatorAgentId ?? null,
        createdAtTick: nextTick(),
      };
      appendAgentEquipment(agentId, instance);
      return HttpResponse.json(instance, { status: 201 });
    },
  ),

  // ---- NPC zones ----
  http.get(`${BASE_URL}/admin/worlds/:worldId/npc-zones`, ({ params }) => {
    const worldId = Number(params.worldId);
    return HttpResponse.json(mockZones.filter((z) => z.worldId === worldId).map(stripWorldId));
  }),
  http.post(`${BASE_URL}/admin/worlds/:worldId/npc-zones`, async ({ params, request }) => {
    const worldId = Number(params.worldId);
    const body = (await request.json().catch(() => null)) as MockZone | null;
    if (!body) return problemResponse(400, 'Bad Request', 'Empty body', request);
    const zone: MockZone = {
      worldId,
      zoneId: crypto.randomUUID(),
      scope: body.scope,
      nodeId: body.nodeId,
      regionId: body.regionId,
      weights: body.weights ?? {},
      maxConcurrent: body.maxConcurrent ?? 5,
      respawnTicks: body.respawnTicks,
      active: body.active ?? true,
    };
    mockZones.push(zone);
    return HttpResponse.json(stripWorldId(zone), { status: 201 });
  }),
  http.delete(`${BASE_URL}/admin/worlds/:worldId/npc-zones/:zoneId`, ({ params }) => {
    const worldId = Number(params.worldId);
    const idx = mockZones.findIndex((z) => z.worldId === worldId && z.zoneId === params.zoneId);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockZones.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

interface MockZone {
  worldId: number;
  zoneId: string;
  scope: 'REGION' | 'NODE';
  regionId?: number;
  nodeId?: number;
  weights: Record<string, number>;
  maxConcurrent: number;
  respawnTicks?: number;
  active: boolean;
}

const mockZones: MockZone[] = [];

function stripWorldId(z: MockZone): Omit<MockZone, 'worldId'> {
  const { worldId: _w, ...rest } = z;
  return rest;
}
