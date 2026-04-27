import type { TerrainType } from '../types';

export const terrainColors: Record<TerrainType, string> = {
  // Temperate greens
  FOREST: '#2d5a2d',
  BIRCH_FOREST: '#7a9a4f',
  RAINFOREST: '#1a4a2a',
  PLAINS: '#c3d48a',
  MEADOW: '#a8cf6f',
  HILLS: '#8aa35a',

  // Harsh
  DESERT: '#e8d49a',
  SALT_FLATS: '#f0ead6',
  ICE_TUNDRA: '#c8e0ec',
  GLACIER: '#e8f2f8',
  VOLCANIC: '#5a1f1a',

  // Water
  COASTAL: '#7ab5d0',
  RIVER_DELTA: '#4a90a4',
  WETLANDS: '#5a7d6a',
  SWAMP: '#2d4a42',

  // Elevated
  MOUNTAIN: '#6b6b6b',
  ALPINE: '#9aa0a6',
  CLIFFSIDE: '#837f78',
  CANYON: '#a0684a',

  // Mystical
  ANCIENT_RUINS: '#8a7d6a',
  CURSED_LAND: '#3a1f4a',
  SACRED_GROVE: '#4fb87a',
  CRYSTAL_CAVES: '#a478d4',
  BLIGHTED: '#4a3a2a',

  // Transitional
  FOREST_EDGE: '#6a8a4a',
  FOOTHILLS: '#967f5a',
  SHORELINE: '#b8c99a',

  // Roads (desaturated)
  DIRT_PATH: '#8a6f5a',
  GRAVEL_ROAD: '#8a8a8a',
  WOODEN_BRIDGE: '#6a4a2a',
  STONE_BRIDGE: '#7a7a7a',
  TRADE_ROUTE: '#9a7f5a',
};

export const colorFor = (t: TerrainType): string => terrainColors[t];
