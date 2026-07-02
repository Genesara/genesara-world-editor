import type { TerrainType } from '../types';

/**
 * Per-terrain 3D decoration spec — small primitive meshes that sit on top of
 * the hex prism to give each biome character. All shapes are simple three.js
 * primitives (cones, icospheres, cylinders, planes), so the world stays
 * geometry-only and the palette stays cohesive.
 *
 * Spawn rules: per hex, a deterministic hash of (q, r) decides whether a
 * decoration spawns (`chance` 0–100) and which slots inside the hex it
 * occupies (`count` 1–3). The same hex always produces the same arrangement.
 */
export type DecorationKind =
  | 'pine' // stacked cones — dense forest
  | 'birch' // pale trunk + green cone — birch forest / sacred
  | 'boulder' // single icosahedron — hills, foothills
  | 'mountain_cap' // stacked icosahedrons — bare mountain
  | 'mountain_snow_cap' // stacked icos with white cap — alpine
  | 'cactus' // tall thin cylinder — desert
  | 'ice_shard' // tiny icosahedron — tundra/glacier
  | 'lava_pool' // emissive sphere — volcanic
  | 'reed' // flat cylinder — swamp/wetland
  | 'water_shimmer' // flat plane — coastal/river
  | 'broken_column' // short fat cylinder — ruins
  | 'crystal' // tall sharp cones — crystal caves
  | 'blight_thorn' // small dark twisted cone — cursed/blighted
  | 'bridge_plank'; // spanning box — bridges

export interface DecorationSpec {
  kind: DecorationKind;
  /** Primary color in hex. */
  color: string;
  /** Optional secondary color (e.g. cone top vs trunk, snow cap). */
  accent?: string;
  /** PBR roughness 0–1. */
  roughness?: number;
  /** PBR metalness 0–1. */
  metalness?: number;
  /** Emissive color for glowing decorations (lava, crystal). */
  emissive?: string;
  /** Emissive intensity. */
  emissiveIntensity?: number;
  /** Base scale multiplier (1 ≈ 0.3 hex outer radius). */
  scale: number;
  /** Number of decorations per hex (deterministic by hash). */
  count: number;
  /** Spawn chance 0–100 — per hex. */
  chance: number;
}

const D = (spec: DecorationSpec): DecorationSpec => spec;

export const decorations: Partial<Record<TerrainType, DecorationSpec>> = {
  // ---- Forests ----
  FOREST: D({ kind: 'pine', color: '#2F4525', scale: 0.35, count: 3, chance: 85 }),
  RAINFOREST: D({ kind: 'pine', color: '#243818', scale: 0.4, count: 3, chance: 95 }),
  BIRCH_FOREST: D({
    kind: 'birch',
    color: '#6B8B4A',
    accent: '#C8D4B0',
    scale: 0.32,
    count: 2,
    chance: 70,
  }),
  SACRED_GROVE: D({
    kind: 'birch',
    color: '#7BA88A',
    accent: '#9B7BB8',
    scale: 0.35,
    count: 2,
    chance: 90,
  }),

  // ---- Hills / foothills (bare-ish, occasional rock) ----
  HILLS: D({ kind: 'boulder', color: '#7A7368', scale: 0.25, count: 1, chance: 40 }),
  FOOTHILLS: D({ kind: 'boulder', color: '#7A7368', scale: 0.25, count: 1, chance: 40 }),

  // ---- Mountains ----
  MOUNTAIN: D({ kind: 'mountain_cap', color: '#8B8378', scale: 0.45, count: 1, chance: 100 }),
  ALPINE: D({
    kind: 'mountain_snow_cap',
    color: '#B8B5A8',
    accent: '#E8ECEF',
    scale: 0.45,
    count: 1,
    chance: 100,
  }),
  CLIFFSIDE: D({ kind: 'mountain_cap', color: '#948C7E', scale: 0.4, count: 1, chance: 100 }),

  // ---- Harsh ----
  DESERT: D({ kind: 'cactus', color: '#6B8B4A', scale: 0.18, count: 1, chance: 15 }),
  ICE_TUNDRA: D({ kind: 'ice_shard', color: '#C8D8E0', scale: 0.18, count: 1, chance: 30 }),
  GLACIER: D({ kind: 'ice_shard', color: '#D4E0E8', scale: 0.22, count: 1, chance: 35 }),
  VOLCANIC: D({
    kind: 'lava_pool',
    color: '#C44528',
    emissive: '#FF6B2E',
    emissiveIntensity: 0.9,
    scale: 0.3,
    count: 1,
    chance: 50,
  }),

  // ---- Water / wet ----
  COASTAL: D({
    kind: 'water_shimmer',
    color: '#4A8FA8',
    roughness: 0.1,
    metalness: 0.1,
    scale: 1,
    count: 1,
    chance: 100,
  }),
  RIVER_DELTA: D({
    kind: 'water_shimmer',
    color: '#5BA08F',
    roughness: 0.15,
    metalness: 0.05,
    scale: 1,
    count: 1,
    chance: 100,
  }),
  WETLANDS: D({ kind: 'reed', color: '#5C6B3A', scale: 0.2, count: 2, chance: 60 }),
  SWAMP: D({ kind: 'reed', color: '#3F4A28', scale: 0.22, count: 2, chance: 70 }),

  // ---- Mystical ----
  ANCIENT_RUINS: D({
    kind: 'broken_column',
    color: '#9B947E',
    scale: 0.22,
    count: 2,
    chance: 100,
  }),
  CRYSTAL_CAVES: D({
    kind: 'crystal',
    color: '#9B7BB8',
    emissive: '#C8B0E0',
    emissiveIntensity: 0.55,
    scale: 0.3,
    count: 3,
    chance: 100,
  }),
  CURSED_LAND: D({ kind: 'blight_thorn', color: '#2F2540', scale: 0.28, count: 1, chance: 50 }),
  BLIGHTED: D({ kind: 'blight_thorn', color: '#3A302A', scale: 0.25, count: 1, chance: 50 }),

  // ---- Roads ----
  WOODEN_BRIDGE: D({ kind: 'bridge_plank', color: '#7A5A3A', scale: 1, count: 1, chance: 100 }),
  STONE_BRIDGE: D({ kind: 'bridge_plank', color: '#A8A096', scale: 1, count: 1, chance: 100 }),
};
