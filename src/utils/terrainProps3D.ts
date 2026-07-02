import type { TerrainType } from '../types';

/**
 * KayKit Medieval Hexagon Pack support for the 3D editor (see
 * public/CREDITS-ASSETS.md). terrain.glb packs two tintable tile bases
 * (`tile_land`, `tile_water`) plus nature/building props as named nodes,
 * normalized to tile circumradius 1. Decoration mapping ported from
 * genesara-web (same TerrainType enum).
 */
export const TERRAIN_GLB = '/models/terrain.glb';

/** Tile circumradius as a fraction of the hex pitch — slight gap between tiles. */
export const TILE_RADIUS_K = 0.96;

/** Terrains rendered with the sunken KayKit water tile instead of the land prism. */
export const WATER_TERRAIN = new Set<TerrainType>(['OCEAN']);

// Per-terrain decoration: which terrain.glb nodes scatter on a tile and how
// many. Terrains absent from this table render bare — their tint carries the
// identity (meadow, salt flats, roads). Props are normalized to
// tile-circumradius units, so scales multiply by the tile world radius.
interface Decoration {
  props: string[];
  min: number;
  max: number;
  /** Single centerpiece (mountain, hill, bridge) instead of a ring scatter. */
  centered?: boolean;
  /** Render with the tile tint instead of the KayKit atlas colors. */
  tinted?: boolean;
}

const DECORATION: Partial<Record<TerrainType, Decoration>> = {
  FOREST: { props: ['prop_tree_single_A', 'prop_tree_single_B', 'prop_trees_A_medium'], min: 2, max: 4 },
  BIRCH_FOREST: { props: ['prop_tree_single_B', 'prop_tree_single_A'], min: 1, max: 3 },
  RAINFOREST: { props: ['prop_trees_A_large', 'prop_trees_B_medium', 'prop_trees_A_medium'], min: 2, max: 3 },
  FOREST_EDGE: { props: ['prop_tree_single_A'], min: 1, max: 2 },
  SACRED_GROVE: { props: ['prop_tree_single_B', 'prop_tree_single_A'], min: 1, max: 2 },
  PLAINS: { props: ['prop_rock_single_B'], min: 0, max: 1 },
  HILLS: { props: ['prop_hill_single_B', 'prop_hill_single_C'], min: 1, max: 1, centered: true },
  FOOTHILLS: { props: ['prop_hill_single_C', 'prop_rock_single_C'], min: 1, max: 2 },
  MOUNTAIN: { props: ['prop_mountain_A', 'prop_mountain_B'], min: 1, max: 1, centered: true },
  ALPINE: { props: ['prop_mountain_C'], min: 1, max: 1, centered: true },
  CLIFFSIDE: { props: ['prop_rock_single_D', 'prop_rock_single_E'], min: 2, max: 3 },
  CANYON: { props: ['prop_rock_single_D', 'prop_rock_single_E'], min: 1, max: 3 },
  VOLCANIC: { props: ['prop_mountain_B'], min: 1, max: 1, centered: true },
  DESERT: { props: ['prop_rock_single_B'], min: 0, max: 2 },
  ICE_TUNDRA: { props: ['prop_rock_single_C'], min: 0, max: 1 },
  GLACIER: { props: ['prop_rock_single_E', 'prop_rock_single_C'], min: 1, max: 2 },
  WETLANDS: { props: ['prop_waterplant_A', 'prop_waterplant_B', 'prop_waterplant_C'], min: 2, max: 4 },
  SWAMP: { props: ['prop_waterplant_B', 'prop_waterplant_C', 'prop_tree_single_A_cut'], min: 2, max: 4 },
  RIVER_DELTA: { props: ['prop_waterlily_A', 'prop_waterlily_B', 'prop_waterplant_A'], min: 1, max: 3 },
  COASTAL: { props: ['prop_waterplant_A', 'prop_rock_single_B'], min: 0, max: 2 },
  SHORELINE: { props: ['prop_rock_single_B'], min: 0, max: 1 },
  ANCIENT_RUINS: { props: ['prop_rock_single_D', 'prop_rock_single_C'], min: 1, max: 2 },
  CURSED_LAND: { props: ['prop_tree_single_B_cut', 'prop_rock_single_D'], min: 1, max: 2 },
  BLIGHTED: { props: ['prop_tree_single_A_cut', 'prop_trees_B_cut'], min: 1, max: 3 },
  CRYSTAL_CAVES: { props: ['prop_rock_single_C', 'prop_rock_single_D', 'prop_rock_single_E'], min: 2, max: 4 },
  WOODEN_BRIDGE: { props: ['bld_bridge'], min: 1, max: 1, centered: true },
  STONE_BRIDGE: { props: ['bld_bridge'], min: 1, max: 1, centered: true, tinted: true },
};

// KayKit hills ship with saturated grass-green tops and dirt skirts that
// clash with the per-terrain tints, so they render untextured and tinted
// with the tile color instead — a raised mound of the same terrain.
const TINTED_PROPS = new Set(['prop_hill_single_B', 'prop_hill_single_C']);

// Prop heights in tile-circumradius units (from terrain.glb bounds) — used
// to float starter markers above whatever sits on the tile.
const PROP_HEIGHT: Record<string, number> = {
  prop_tree_single_A: 0.95,
  prop_tree_single_B: 0.96,
  prop_trees_A_medium: 1.1,
  prop_trees_A_large: 0.79,
  prop_trees_B_medium: 1.0,
  prop_tree_single_A_cut: 0.2,
  prop_tree_single_B_cut: 0.12,
  prop_trees_B_cut: 0.13,
  prop_rock_single_B: 0.12,
  prop_rock_single_C: 0.17,
  prop_rock_single_D: 0.14,
  prop_rock_single_E: 0.17,
  prop_hill_single_B: 0.36,
  prop_hill_single_C: 0.51,
  prop_mountain_A: 1.23,
  prop_mountain_B: 1.53,
  prop_mountain_C: 1.31,
  prop_waterplant_A: 0.1,
  prop_waterplant_B: 0.2,
  prop_waterplant_C: 0.2,
  prop_waterlily_A: 0.01,
  prop_waterlily_B: 0.01,
  bld_bridge: 0.35,
};

// Wide props hug the tile centre so their footprint stays on the hex.
const BIG_PROPS = new Set([
  'prop_trees_A_medium',
  'prop_trees_A_large',
  'prop_trees_B_medium',
  'prop_trees_B_cut',
  'prop_hill_single_B',
  'prop_hill_single_C',
  'prop_mountain_A',
  'prop_mountain_B',
  'prop_mountain_C',
  'bld_bridge',
]);

/** Cheap deterministic hash of an axial coord. */
export function hashCoord(q: number, r: number, salt = 0): number {
  let h = ((q | 0) * 73856093) ^ ((r | 0) * 19349663) ^ (salt * 83492791);
  h ^= h >>> 16;
  return Math.abs(h | 0);
}

// Deterministic per-tile RNG: same (q, r) ⇒ same scatter, every render.
function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlacedProp {
  prop: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number; // world units (already multiplied by tile radius)
  tinted: boolean;
  tileColor: string; // tile tint, for tinted props
}

export interface TileForProps {
  q: number;
  r: number;
  terrain: TerrainType;
  x: number;
  z: number;
  height: number;
  radius: number;
  colorHex: string;
}

// densityK scales prop counts down as the region grows, keeping total
// instances bounded no matter how large the loaded map is.
export function placeProps(tiles: TileForProps[]): PlacedProp[] {
  const densityK = Math.min(1, Math.max(0.35, 250 / Math.max(1, tiles.length)));
  const placements: PlacedProp[] = [];

  for (const tile of tiles) {
    const deco = DECORATION[tile.terrain];
    if (!deco) continue;
    const rand = mulberry32(hashCoord(tile.q, tile.r) * 2654435761);
    const span = deco.max - deco.min;
    const count = Math.round((deco.min + rand() * span) * (deco.centered ? 1 : densityK));
    if (count === 0) continue;

    for (let i = 0; i < count; i++) {
      const prop = deco.props[Math.floor(rand() * deco.props.length)];
      const big = deco.centered || BIG_PROPS.has(prop);
      const ringMin = big ? 0 : 0.18;
      const ringMax = big ? 0.16 : 0.55;
      const dist = (ringMin + rand() * (ringMax - ringMin)) * tile.radius;
      const angle = rand() * Math.PI * 2;
      // Centerpieces (bridges especially) snap to edge-aligned angles.
      const rotation = deco.centered
        ? Math.floor(rand() * 6) * (Math.PI / 3)
        : rand() * Math.PI * 2;
      placements.push({
        prop,
        x: tile.x + dist * Math.cos(angle),
        y: tile.height,
        z: tile.z + dist * Math.sin(angle),
        rotation,
        scale: tile.radius * (0.85 + rand() * 0.3),
        tinted: deco.tinted === true || TINTED_PROPS.has(prop),
        tileColor: tile.colorHex,
      });
    }
  }

  return placements;
}

/**
 * Worst-case prop top above the tile top (world units, assuming tile radius
 * ≈ 1) — floats starter markers above trees/mountains instead of inside them.
 */
export function propClearance(terrain: TerrainType): number {
  const deco = DECORATION[terrain];
  if (!deco) return 0;
  let max = 0;
  for (const p of deco.props) max = Math.max(max, PROP_HEIGHT[p] ?? 0.5);
  return max * TILE_RADIUS_K * 1.15;
}
