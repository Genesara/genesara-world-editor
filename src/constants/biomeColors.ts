import type { Biome } from '../types';

/**
 * Colors used to render the globe's face fills. Picked to read at the icosphere zoom level —
 * they're slightly more saturated than [terrainColors] so each biome stays distinct from a
 * distance.
 */
export const biomeColors: Record<Biome, string> = {
  FOREST: '#2d5a2d',
  PLAINS: '#c3d48a',
  MOUNTAIN: '#6b6b6b',
  COASTAL: '#7ab5d0',
  SWAMP: '#2d4a42',
  RUINS: '#8a7d6a',
  DESERT: '#e8d49a',
  TUNDRA: '#c8e0ec',
};

export const biomeColorFor = (b: Biome): string => biomeColors[b];
