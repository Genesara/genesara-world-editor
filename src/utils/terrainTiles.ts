import type { TerrainType } from '../types';

/**
 * Per-terrain visual treatment for the 3D map view.
 *
 * Hexes render as KayKit tile prisms tinted with `topColor` (see
 * terrainProps3D.ts). `height` is the plinth height in world units — a gentle
 * elevation curve (peaks ~1.3, water ~0.2) because the dramatic silhouettes
 * now come from the mountain/hill/tree props that sit on top, not the prism
 * itself.
 *
 * Palette anchors (see ui-ux-designer spec): sky #B8D4E3, grass-base #6B8E4E,
 * rock-base #7A7368, water-base #4A8FA8, accent-warm #D4A574, accent-cool
 * #9B7BB8, deep shadow #2A2F3E. Every terrain color is a tonal child of one
 * anchor, which is what makes the world read as a single palette.
 */
export interface TerrainTile {
  topColor: string;
  sideColor: string;
  height: number;
  roughness: number;
}

const T = (
  topColor: string,
  sideColor: string,
  height: number,
  roughness: number,
): TerrainTile => ({ topColor, sideColor, height, roughness });

export const terrainTiles: Record<TerrainType, TerrainTile> = {
  // Temperate
  FOREST: T('#4A6B3A', '#2F4525', 0.54, 0.85),
  BIRCH_FOREST: T('#6B8B4A', '#45593A', 0.54, 0.85),
  RAINFOREST: T('#3D5C2E', '#243818', 0.59, 0.9),
  PLAINS: T('#8FA85C', '#5C6F3A', 0.38, 0.85),
  MEADOW: T('#A4B96B', '#6B7A45', 0.38, 0.8),
  HILLS: T('#7A8F4E', '#4F5E33', 0.73, 0.85),

  // Harsh
  DESERT: T('#DDB87A', '#8F6F45', 0.36, 0.95),
  SALT_FLATS: T('#E8DCC4', '#968B78', 0.31, 0.7),
  ICE_TUNDRA: T('#D4DCE0', '#7E8C99', 0.36, 0.4),
  GLACIER: T('#C8D8E0', '#6F8392', 1.01, 0.3),
  VOLCANIC: T('#3A2F2C', '#1A1412', 1.19, 0.95),

  // Water
  COASTAL: T('#5BA0B8', '#2F5C6E', 0.31, 0.15),
  RIVER_DELTA: T('#6FA890', '#3F6655', 0.27, 0.25),
  WETLANDS: T('#6B7A4F', '#3F4A2E', 0.29, 0.55),
  SWAMP: T('#4A5A3F', '#2A3525', 0.27, 0.6),
  OCEAN: T('#3D7BA0', '#1F4263', 0.2, 0.1),

  // Elevated
  MOUNTAIN: T('#8B8378', '#4A4540', 1.3, 0.95),
  ALPINE: T('#B8B5A8', '#6F6C62', 1.07, 0.85),
  CLIFFSIDE: T('#948C7E', '#524A3F', 0.96, 0.95),
  CANYON: T('#B07D54', '#6B452A', 0.84, 0.95),

  // Mystical
  ANCIENT_RUINS: T('#9B947E', '#524F42', 0.5, 0.8),
  CURSED_LAND: T('#5A4A6B', '#2F2540', 0.45, 0.85),
  SACRED_GROVE: T('#7BA88A', '#3F5A48', 0.54, 0.7),
  CRYSTAL_CAVES: T('#8B7BB0', '#463E5C', 0.78, 0.25),
  BLIGHTED: T('#6B5C4A', '#3A302A', 0.43, 0.95),

  // Transitional
  FOREST_EDGE: T('#6B8A4E', '#42542F', 0.5, 0.85),
  FOOTHILLS: T('#84865C', '#4F523A', 0.67, 0.9),
  SHORELINE: T('#B8B07A', '#6F6A4A', 0.29, 0.7),

  // Roads
  DIRT_PATH: T('#8B7556', '#564738', 0.36, 0.95),
  GRAVEL_ROAD: T('#9B958A', '#5C5852', 0.36, 0.95),
  WOODEN_BRIDGE: T('#7A5A3A', '#3F2E1E', 0.4, 0.8),
  STONE_BRIDGE: T('#A8A096', '#5C564E', 0.4, 0.85),
  TRADE_ROUTE: T('#B8A484', '#6F5F45', 0.36, 0.85),
};
