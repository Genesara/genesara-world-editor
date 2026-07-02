import type { Biome } from '../types';

export interface BiomeGroup {
  label: string;
  biomes: Biome[];
}

/**
 * Eight backend biomes, grouped for the globe-face picker. Coarser than [terrainGroups], which
 * still drives the per-tile hex editor.
 */
export const biomeGroups: BiomeGroup[] = [
  {
    label: 'Land',
    biomes: ['FOREST', 'PLAINS', 'MOUNTAIN', 'DESERT'],
  },
  {
    label: 'Water & Wetlands',
    biomes: ['OCEAN', 'COASTAL', 'SWAMP'],
  },
  {
    label: 'Frontier',
    biomes: ['TUNDRA', 'RUINS'],
  },
];

export const allBiomes: Biome[] = biomeGroups.flatMap((g) => g.biomes);

export const biomeLabel = (b: Biome): string =>
  b.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
