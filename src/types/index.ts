export type TerrainType =
  // Temperate
  | 'FOREST'
  | 'BIRCH_FOREST'
  | 'RAINFOREST'
  | 'PLAINS'
  | 'MEADOW'
  | 'HILLS'
  // Harsh
  | 'DESERT'
  | 'SALT_FLATS'
  | 'ICE_TUNDRA'
  | 'GLACIER'
  | 'VOLCANIC'
  // Water
  | 'COASTAL'
  | 'RIVER_DELTA'
  | 'WETLANDS'
  | 'SWAMP'
  // Elevated
  | 'MOUNTAIN'
  | 'ALPINE'
  | 'CLIFFSIDE'
  | 'CANYON'
  // Mystical
  | 'ANCIENT_RUINS'
  | 'CURSED_LAND'
  | 'SACRED_GROVE'
  | 'CRYSTAL_CAVES'
  | 'BLIGHTED'
  // Transitional
  | 'FOREST_EDGE'
  | 'FOOTHILLS'
  | 'SHORELINE'
  // Roads
  | 'DIRT_PATH'
  | 'GRAVEL_ROAD'
  | 'WOODEN_BRIDGE'
  | 'STONE_BRIDGE'
  | 'TRADE_ROUTE';

/**
 * Coarse classification for an icosphere face (a region on the globe). Eight values match the
 * backend `Biome` enum. Per-tile fine terrain still uses [TerrainType].
 */
export type Biome =
  | 'FOREST'
  | 'PLAINS'
  | 'MOUNTAIN'
  | 'COASTAL'
  | 'SWAMP'
  | 'RUINS'
  | 'DESERT'
  | 'TUNDRA';

export interface Node {
  id?: number;
  q: number;
  r: number;
  terrain: TerrainType;
}

export type NodeKey = string;

export interface World {
  id?: number;
  name: string;
  node_count: number;
  node_size: number;
  created_at?: string;
}

export type Vec3 = [number, number, number];

export type ClimateType =
  | 'ARCTIC'
  | 'SUBARCTIC'
  | 'HIGHLAND'
  | 'OCEANIC'
  | 'CONTINENTAL'
  | 'MEDITERRANEAN'
  | 'SUBTROPICAL'
  | 'TROPICAL'
  | 'MONSOON'
  | 'SEMI_ARID'
  | 'ARID'
  | 'VOLCANIC'
  | 'MAGICAL';

export interface GlobeNode {
  id?: number;
  world_id: number;
  sphere_index: number;
  biome: Biome | null;
  climate: ClimateType | null;
  face_vertices: Vec3[];
  centroid: Vec3;
  neighbor_indices: number[];
}

export function isCreatedNode(
  node: GlobeNode,
): node is GlobeNode & { biome: Biome; climate: ClimateType } {
  return node.biome !== null && node.climate !== null;
}

export type ViewState =
  | { type: 'worlds' }
  | { type: 'globe'; worldId: number }
  | { type: 'editor'; worldId: number; sphereIndex: number };
