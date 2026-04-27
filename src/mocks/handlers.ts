import { http, HttpResponse } from 'msw';
import type { Biome, ClimateType, GlobeNode, Node, Vec3 } from '../types';
import { keyOf } from '../utils/keyOf';
import { buildWorldWithNodes, seedHexesForGlobeNode } from './seed';
import {
  getGlobeNode,
  getGlobeNodes,
  getHexes,
  getWorld,
  listWorlds,
  nextWorldId,
  saveGlobeNodes,
  saveHexes,
  saveWorlds,
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

export const handlers = [
  // ---- Worlds ----
  http.get(`${BASE_URL}/api/worlds`, () => {
    return HttpResponse.json(listWorlds());
  }),

  http.post(`${BASE_URL}/api/worlds`, async ({ request }) => {
    let body: CreateWorldBody;
    try {
      body = (await request.json()) as CreateWorldBody;
    } catch {
      return HttpResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body?.name || !Number.isFinite(body.node_count) || !Number.isFinite(body.node_size)) {
      return HttpResponse.json({ error: 'Invalid body' }, { status: 400 });
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

  http.get(`${BASE_URL}/api/worlds/:worldId`, ({ params }) => {
    const worldId = Number(params.worldId);
    const world = getWorld(worldId);
    if (!world) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(world);
  }),

  // ---- Globe nodes ----
  http.get(`${BASE_URL}/api/worlds/:worldId/nodes`, ({ params }) => {
    const worldId = Number(params.worldId);
    if (!getWorld(worldId)) {
      return HttpResponse.json({ error: 'World not found' }, { status: 404 });
    }
    return HttpResponse.json(getGlobeNodes(worldId));
  }),

  http.post(`${BASE_URL}/api/worlds/:worldId/nodes`, async ({ params, request }) => {
    const worldId = Number(params.worldId);
    if (!getWorld(worldId)) {
      return HttpResponse.json({ error: 'World not found' }, { status: 404 });
    }
    let body: CreateGlobeNodeBody;
    try {
      body = (await request.json()) as CreateGlobeNodeBody;
    } catch {
      return HttpResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (
      !body ||
      !Number.isFinite(body.sphere_index) ||
      !body.biome ||
      !body.climate
    ) {
      return HttpResponse.json(
        { error: 'sphere_index, biome, and climate are required' },
        { status: 400 },
      );
    }
    const existing = getGlobeNodes(worldId);
    const byIndex = new Map<number, GlobeNode>();
    for (const n of existing) byIndex.set(n.sphere_index, n);
    const prior = byIndex.get(body.sphere_index);
    if (!prior && (!body.face_vertices || !body.centroid || !body.neighbor_indices)) {
      return HttpResponse.json(
        { error: 'face_vertices, centroid, and neighbor_indices required for new face' },
        { status: 400 },
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
        return HttpResponse.json({ error: 'World not found' }, { status: 404 });
      }
      const prior = getGlobeNode(worldId, sphereIndex);
      if (!prior) {
        return HttpResponse.json({ error: 'Node not found' }, { status: 404 });
      }
      let body: PatchGlobeNodeBody;
      try {
        body = (await request.json()) as PatchGlobeNodeBody;
      } catch {
        return HttpResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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
    ({ params }) => {
      const worldId = Number(params.worldId);
      const sphereIndex = Number(params.sphereIndex);
      const node = getGlobeNode(worldId, sphereIndex);
      if (!node) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
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
        return HttpResponse.json({ error: 'Globe node not found' }, { status: 404 });
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
        return HttpResponse.json({ error: 'Globe node not found' }, { status: 404 });
      }
      let body: PatchHexesBody;
      try {
        body = (await request.json()) as PatchHexesBody;
      } catch {
        return HttpResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      if (!body || !Array.isArray(body.nodes)) {
        return HttpResponse.json({ error: 'Invalid body' }, { status: 400 });
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
];