import { createNoise2D } from 'simplex-noise';
import Alea from 'alea';
import type { Node, TerrainType } from '../types';

const MYSTICAL: TerrainType[] = ['ANCIENT_RUINS', 'CRYSTAL_CAVES', 'SACRED_GROVE', 'CURSED_LAND'];

/**
 * Classify terrain from elevation + moisture noise values in [-1, 1].
 */
function classify(elevation: number, moisture: number): TerrainType {
  // Water tier
  if (elevation < -0.45) return 'COASTAL';
  if (elevation < -0.3) {
    if (moisture > 0.3) return 'RIVER_DELTA';
    return 'SHORELINE';
  }

  // Peak tier
  if (elevation > 0.7) {
    if (moisture < -0.2) return 'VOLCANIC';
    if (moisture > 0.4) return 'GLACIER';
    return 'ALPINE';
  }
  if (elevation > 0.5) {
    if (moisture < -0.2) return 'CLIFFSIDE';
    return 'MOUNTAIN';
  }
  if (elevation > 0.35) {
    if (moisture < -0.3) return 'CANYON';
    return 'FOOTHILLS';
  }

  // Hills
  if (elevation > 0.2) {
    if (moisture > 0.4) return 'FOREST_EDGE';
    if (moisture < -0.3) return 'DESERT';
    return 'HILLS';
  }

  // Lowlands — moisture driven
  if (moisture > 0.55) return 'SWAMP';
  if (moisture > 0.35) return 'WETLANDS';
  if (moisture > 0.15) {
    if (elevation < 0) return 'RAINFOREST';
    return 'FOREST';
  }
  if (moisture > -0.1) {
    if (elevation > 0.1) return 'BIRCH_FOREST';
    return 'MEADOW';
  }
  if (moisture > -0.35) return 'PLAINS';

  // Dry lowlands
  if (elevation < -0.1) return 'SALT_FLATS';
  if (moisture < -0.6) return 'ICE_TUNDRA';
  return 'DESERT';
}

export interface GenerateMapOpts {
  radius: number;
  seed?: string | number;
  mysticalDensity?: number;
  elevationScale?: number;
  moistureScale?: number;
}

/**
 * Fill the hexes of `coordinates` with procedurally chosen terrain.
 * Elevation + moisture noise pick the main biome; a third random pass
 * sprinkles mystical types at ~2% density by default.
 */
export function generateMap(
  coordinates: Array<{ q: number; r: number }>,
  opts: GenerateMapOpts,
): Node[] {
  const {
    radius,
    seed = Date.now().toString(),
    mysticalDensity = 0.02,
    elevationScale = 1 / Math.max(6, radius * 0.4),
    moistureScale = 1 / Math.max(4, radius * 0.3),
  } = opts;

  const rng = Alea(String(seed));
  const elevationNoise = createNoise2D(rng);
  const moistureRng = Alea(String(seed) + '-m');
  const moistureNoise = createNoise2D(moistureRng);
  const mysticalRng = Alea(String(seed) + '-x');

  // fractal octaves for richer terrain
  const fbm = (n: (x: number, y: number) => number, x: number, y: number): number => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < 4; o++) {
      sum += n(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };

  return coordinates.map(({ q, r }) => {
    const elev = fbm(elevationNoise, q * elevationScale, r * elevationScale);
    const moist = fbm(moistureNoise, q * moistureScale + 100, r * moistureScale + 100);
    let terrain = classify(elev, moist);
    if (mysticalRng() < mysticalDensity) {
      terrain = MYSTICAL[Math.floor(mysticalRng() * MYSTICAL.length)];
    }
    return { q, r, terrain };
  });
}
