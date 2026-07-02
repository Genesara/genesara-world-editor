import type { Biome, ClimateType, RaceId, Rarity, TerrainType } from '../types';

export const BIOMES: readonly Biome[] = [
  'FOREST',
  'PLAINS',
  'MOUNTAIN',
  'COASTAL',
  'SWAMP',
  'RUINS',
  'DESERT',
  'TUNDRA',
  'OCEAN',
] as const;

export const CLIMATES: readonly ClimateType[] = [
  'ARCTIC',
  'SUBARCTIC',
  'HIGHLAND',
  'OCEANIC',
  'CONTINENTAL',
  'MEDITERRANEAN',
  'SUBTROPICAL',
  'TROPICAL',
  'MONSOON',
  'SEMI_ARID',
  'ARID',
  'VOLCANIC',
  'MAGICAL',
] as const;

export const TERRAINS: readonly TerrainType[] = [
  'FOREST',
  'BIRCH_FOREST',
  'RAINFOREST',
  'PLAINS',
  'MEADOW',
  'HILLS',
  'DESERT',
  'SALT_FLATS',
  'ICE_TUNDRA',
  'GLACIER',
  'VOLCANIC',
  'COASTAL',
  'RIVER_DELTA',
  'WETLANDS',
  'SWAMP',
  'OCEAN',
  'MOUNTAIN',
  'ALPINE',
  'CLIFFSIDE',
  'CANYON',
  'ANCIENT_RUINS',
  'CURSED_LAND',
  'SACRED_GROVE',
  'CRYSTAL_CAVES',
  'BLIGHTED',
  'FOREST_EDGE',
  'FOOTHILLS',
  'SHORELINE',
  'DIRT_PATH',
  'GRAVEL_ROAD',
  'WOODEN_BRIDGE',
  'STONE_BRIDGE',
  'TRADE_ROUTE',
] as const;

export const RARITIES: readonly Rarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const;

export function isBiome(x: unknown): x is Biome {
  return typeof x === 'string' && (BIOMES as readonly string[]).includes(x);
}

export function isClimate(x: unknown): x is ClimateType {
  return typeof x === 'string' && (CLIMATES as readonly string[]).includes(x);
}

export function isTerrain(x: unknown): x is TerrainType {
  return typeof x === 'string' && (TERRAINS as readonly string[]).includes(x);
}

export function isRarity(x: unknown): x is Rarity {
  return typeof x === 'string' && (RARITIES as readonly string[]).includes(x);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(x: unknown): x is string {
  return typeof x === 'string' && UUID_RE.test(x);
}

/**
 * Known race IDs. Stored lowercase to match the backend's wire format —
 * `GET /starter-nodes` returns `raceId: "human_commoner"`. UI labels uppercase
 * for readability via `formatRaceLabel`.
 */
export const KNOWN_RACES: readonly RaceId[] = [
  'human_highland',
  'human_steppe',
  'human_commoner',
] as const;

export function isKnownRace(x: unknown): x is RaceId {
  if (typeof x !== 'string') return false;
  const lower = x.toLowerCase();
  return (KNOWN_RACES as readonly string[]).includes(lower);
}

export function normalizeRaceId(x: string): RaceId {
  return x.toLowerCase();
}

export function formatRaceLabel(raceId: RaceId): string {
  return raceId.toUpperCase();
}

/** Biomes that cannot host a race spawn point (currently only OCEAN). */
export const NON_TRAVERSABLE_BIOMES: ReadonlySet<Biome> = new Set<Biome>(['OCEAN']);

/**
 * Hex-tile terrain types where a starter spawn is rejected. Starter validation
 * runs at the tile level: PUT /api/worlds/{id}/starter-nodes/{race} expects a
 * Node.id, the server (and the MSW mock) looks up the tile and rejects if its
 * terrain is in this set.
 */
export const NON_TRAVERSABLE_TERRAINS: ReadonlySet<TerrainType> = new Set<TerrainType>([
  'OCEAN',
  'GLACIER',
]);
