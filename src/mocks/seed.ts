import type { Biome, GlobeNode, Node, TerrainType, World } from '../types';
import {
  frequencyForNodeCount,
  generateGoldberg,
  faceCountForFrequency,
} from '../utils/goldberg';
import { generateMap } from '../utils/generateMap';

const BIOME_TO_TERRAIN: Record<Biome, TerrainType> = {
  FOREST: 'FOREST',
  PLAINS: 'PLAINS',
  MOUNTAIN: 'MOUNTAIN',
  COASTAL: 'COASTAL',
  SWAMP: 'SWAMP',
  RUINS: 'ANCIENT_RUINS',
  DESERT: 'DESERT',
  TUNDRA: 'ICE_TUNDRA',
  OCEAN: 'OCEAN',
};

/**
 * Small demo map used when a GlobeNode has no saved hex terrain yet.
 * Radius-4 hexagon with a river of WETLANDS cutting through and a small forest cluster.
 */
export function seedNodes(): Node[] {
  const nodes: Node[] = [];
  const R = 4;
  for (let q = -R; q <= R; q++) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R, -q + R);
    for (let r = rMin; r <= rMax; r++) {
      let terrain: TerrainType = 'PLAINS';
      if (q === 0 || (q + r === 0 && Math.abs(q) < 3)) terrain = 'WETLANDS';
      else if (q * q + r * r + q * r < 4) terrain = 'FOREST';
      else if (q > 2) terrain = 'HILLS';
      else if (r < -2) terrain = 'DESERT';
      nodes.push({ q, r, terrain });
    }
  }
  return nodes;
}

export function buildWorldWithNodes(input: {
  id: number;
  name: string;
  node_count: number;
  node_size: number;
}): { world: World; globeNodes: GlobeNode[] } {
  const T = frequencyForNodeCount(input.node_count);
  const actualCount = faceCountForFrequency(T);
  const mesh = generateGoldberg(T);
  const createdAt = new Date().toISOString();

  const world: World = {
    id: input.id,
    name: input.name,
    node_count: actualCount,
    node_size: input.node_size,
    created_at: createdAt,
  };

  // Faces are persisted empty; users fill biome + climate by clicking on the globe.
  const globeNodes: GlobeNode[] = mesh.faces.map((face) => ({
    world_id: input.id,
    sphere_index: face.index,
    biome: null,
    climate: null,
    face_vertices: face.vertices,
    centroid: face.centroid,
    neighbor_indices: face.neighbors,
  }));

  return { world, globeNodes };
}

/**
 * Seed a hex grid for one GlobeNode on first open.
 * Uses deterministic per-node seed so the grid is stable across reloads before any paint.
 */
export function seedHexesForGlobeNode(
  worldId: number,
  sphereIndex: number,
  radius: number,
  biomeHint?: Biome,
): Node[] {
  const coords: Array<{ q: number; r: number }> = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) coords.push({ q, r });
  }
  const generated = generateMap(coords, {
    radius,
    seed: `w${worldId}-n${sphereIndex}`,
  });
  if (biomeHint) {
    // Bias the outer ring toward the globe node's overall biome (mapped to a representative
    // tile-level terrain) for visual continuity.
    const hintTerrain = BIOME_TO_TERRAIN[biomeHint];
    const edgeBand = Math.max(1, Math.floor(radius * 0.2));
    for (const node of generated) {
      const dist = (Math.abs(node.q) + Math.abs(node.r) + Math.abs(node.q + node.r)) / 2;
      if (dist > radius - edgeBand && Math.random() < 0.6) {
        node.terrain = hintTerrain;
      }
    }
  }
  return generated;
}