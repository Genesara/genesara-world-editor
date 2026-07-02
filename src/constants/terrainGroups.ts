import type { TerrainType } from '../types';

export interface TerrainGroup {
  label: string;
  terrains: TerrainType[];
}

export const terrainGroups: TerrainGroup[] = [
  {
    label: 'Temperate',
    terrains: ['PLAINS', 'MEADOW', 'HILLS', 'FOREST', 'BIRCH_FOREST', 'RAINFOREST'],
  },
  {
    label: 'Harsh',
    terrains: ['DESERT', 'SALT_FLATS', 'ICE_TUNDRA', 'GLACIER', 'VOLCANIC'],
  },
  {
    label: 'Water',
    terrains: ['OCEAN', 'COASTAL', 'RIVER_DELTA', 'WETLANDS', 'SWAMP'],
  },
  {
    label: 'Elevated',
    terrains: ['MOUNTAIN', 'ALPINE', 'CLIFFSIDE', 'CANYON'],
  },
  {
    label: 'Mystical',
    terrains: ['ANCIENT_RUINS', 'CURSED_LAND', 'SACRED_GROVE', 'CRYSTAL_CAVES', 'BLIGHTED'],
  },
  {
    label: 'Transitional',
    terrains: ['FOREST_EDGE', 'FOOTHILLS', 'SHORELINE'],
  },
  {
    label: 'Roads',
    terrains: ['DIRT_PATH', 'GRAVEL_ROAD', 'WOODEN_BRIDGE', 'STONE_BRIDGE', 'TRADE_ROUTE'],
  },
];

export const allTerrains: TerrainType[] = terrainGroups.flatMap((g) => g.terrains);

export const terrainLabel = (t: TerrainType): string =>
  t.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
