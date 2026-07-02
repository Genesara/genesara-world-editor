import { createNoise3D } from 'simplex-noise';
import Alea from 'alea';
import type { TerrainType, Vec3 } from '../types';

const MYSTICAL: TerrainType[] = ['ANCIENT_RUINS', 'CRYSTAL_CAVES', 'SACRED_GROVE', 'CURSED_LAND'];

function classify(elevation: number, moisture: number): TerrainType {
  if (elevation < -0.45) return 'COASTAL';
  if (elevation < -0.3) {
    if (moisture > 0.3) return 'RIVER_DELTA';
    return 'SHORELINE';
  }
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
  if (elevation > 0.2) {
    if (moisture > 0.4) return 'FOREST_EDGE';
    if (moisture < -0.3) return 'DESERT';
    return 'HILLS';
  }
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
  if (elevation < -0.1) return 'SALT_FLATS';
  if (moisture < -0.6) return 'ICE_TUNDRA';
  return 'DESERT';
}

export interface SphereTerrainOpts {
  seed: string;
  frequency?: number;
  mysticalDensity?: number;
}

export interface SphereTerrainSampler {
  sample(centroid: Vec3): TerrainType;
}

/**
 * Creates a 3D-noise-based terrain classifier suitable for a globe's face centroids.
 * The sphere frequency controls how many distinct biomes appear per world; higher
 * frequencies produce more fragmented terrain.
 */
export function createSphereTerrain(opts: SphereTerrainOpts): SphereTerrainSampler {
  const { seed, frequency = 1.8, mysticalDensity = 0.02 } = opts;
  const elevationNoise = createNoise3D(Alea(seed));
  const moistureNoise = createNoise3D(Alea(seed + '-m'));
  const mysticalRng = Alea(seed + '-x');

  const fbm = (
    n: (x: number, y: number, z: number) => number,
    p: Vec3,
  ): number => {
    let amp = 1;
    let freq = frequency;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < 4; o++) {
      sum += n(p.x * freq, p.y * freq, p.z * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };

  return {
    sample(centroid: Vec3): TerrainType {
      const elev = fbm(elevationNoise, centroid);
      const moist = fbm(moistureNoise, {
        x: centroid.x + 17,
        y: centroid.y + 31,
        z: centroid.z + 53,
      });
      let terrain = classify(elev, moist);
      if (mysticalRng() < mysticalDensity) {
        terrain = MYSTICAL[Math.floor(mysticalRng() * MYSTICAL.length)];
      }
      return terrain;
    },
  };
}
