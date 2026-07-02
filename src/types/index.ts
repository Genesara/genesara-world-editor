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
  | 'OCEAN'
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
 * Coarse classification for an icosphere face (a region on the globe). Nine values match the
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
  | 'TUNDRA'
  | 'OCEAN';

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

/**
 * 3D point as a named-axis object. Matches the backend wire format for
 * `face_vertices` and `centroid`: `{"x":..,"y":..,"z":..}`.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

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

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type RaceId = string;

export interface StarterNode {
  raceId: RaceId;
  nodeId: number;
}

export type ItemCategory = 'EQUIPMENT' | 'CONSUMABLE' | 'MATERIAL';

export interface ItemCatalogEntry {
  itemId: string;
  category: ItemCategory;
  maxDurability: number | null;
  defaultRarity: Rarity;
}

export interface EquipmentInstance {
  instanceId: string;
  itemId: string;
  rarity: Rarity;
  durabilityCurrent: number;
  durabilityMax: number;
  creatorAgentId: string | null;
  createdAtTick: number;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

export type ViewState =
  | { type: 'worlds' }
  | { type: 'globe'; worldId: number }
  | { type: 'editor'; worldId: number; sphereIndex: number }
  | { type: 'admin' };
