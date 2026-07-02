import type { TerrainType } from '../types';
import { terrainColors } from '../constants/terrainColors';
import { hashCoord } from './terrainProps3D';

/**
 * 2D tile sprites baked from the Kenney Hexagon Pack (public/tiles2d, see
 * public/CREDITS-ASSETS.md). At load time each terrain gets a few sprite
 * variants: a plain Kenney base tile is grayscaled, multiply-tinted with the
 * terrain palette color, clipped to the exact grid hexagon, then object
 * sprites (pines, rocks, cacti, tombstones…) are stamped deterministically.
 * MapCanvas blits the cached canvases per hex — same cost class as the old
 * flat fills, but with real art.
 */

/** Hex circumradius in baked-sprite pixels (grid hexes are 20 CSS px; zoom ≤5×). */
const SPRITE_HEX_SIZE = 64;
/** Extra headroom above the hex so tall objects (trees, towers) can overflow. */
const SPRITE_TOP_MARGIN = Math.round(SPRITE_HEX_SIZE * 0.55);
const VARIANTS = 3;

interface Terrain2D {
  base: 'base_grass' | 'base_dirt';
  /** Object sprite pool (file names in public/tiles2d, without .png). */
  objects?: string[];
  min?: number;
  max?: number;
  /** Object height as a fraction of the hex height (2 × size). */
  objectScale?: number;
  /** Single centerpiece instead of a scatter. */
  centered?: boolean;
}

const TERRAIN_2D: Record<TerrainType, Terrain2D> = {
  // Temperate
  FOREST: { base: 'base_grass', objects: ['treePine_large', 'treePine_small'], min: 2, max: 3 },
  BIRCH_FOREST: { base: 'base_grass', objects: ['treeRound_small', 'treeRound_large'], min: 1, max: 2 },
  RAINFOREST: { base: 'base_grass', objects: ['treePine_large', 'treeRound_large'], min: 2, max: 3 },
  PLAINS: { base: 'base_grass' },
  MEADOW: { base: 'base_grass' },
  HILLS: { base: 'base_grass', objects: ['rockBrown_small'], min: 1, max: 1 },

  // Harsh
  DESERT: { base: 'base_dirt', objects: ['cactus1', 'cactus2'], min: 0, max: 1 },
  SALT_FLATS: { base: 'base_grass' },
  ICE_TUNDRA: { base: 'base_grass', objects: ['rockGrey_small3'], min: 0, max: 1 },
  GLACIER: { base: 'base_grass', objects: ['rockGrey_medium3'], min: 1, max: 1 },
  VOLCANIC: { base: 'base_dirt', objects: ['fire', 'rockBrown_large'], min: 1, max: 2 },

  // Water
  COASTAL: { base: 'base_grass' },
  RIVER_DELTA: { base: 'base_grass' },
  WETLANDS: { base: 'base_grass', objects: ['log'], min: 0, max: 1 },
  SWAMP: { base: 'base_grass', objects: ['log', 'logPile'], min: 1, max: 2 },
  OCEAN: { base: 'base_grass' },

  // Elevated
  MOUNTAIN: { base: 'base_grass', objects: ['rockGrey_large'], min: 1, max: 1, centered: true, objectScale: 0.62 },
  ALPINE: { base: 'base_grass', objects: ['rockGrey_large'], min: 1, max: 1, centered: true, objectScale: 0.55 },
  CLIFFSIDE: { base: 'base_grass', objects: ['rockGrey_medium1', 'rockGrey_medium2'], min: 2, max: 2 },
  CANYON: { base: 'base_dirt', objects: ['rockBrown_large'], min: 1, max: 2 },

  // Mystical
  ANCIENT_RUINS: { base: 'base_grass', objects: ['ruins_brick1', 'ruins_brick2', 'towerRuin'], min: 1, max: 2 },
  CURSED_LAND: { base: 'base_grass', objects: ['tombstone1', 'tombstone2'], min: 1, max: 2 },
  SACRED_GROVE: { base: 'base_grass', objects: ['treeRound_large'], min: 1, max: 2 },
  CRYSTAL_CAVES: { base: 'base_grass', objects: ['crystals1', 'crystals2'], min: 2, max: 2 },
  BLIGHTED: { base: 'base_grass', objects: ['logPile'], min: 0, max: 1 },

  // Transitional
  FOREST_EDGE: { base: 'base_grass', objects: ['treePine_small'], min: 1, max: 1 },
  FOOTHILLS: { base: 'base_grass', objects: ['rockGrey_small1'], min: 1, max: 2 },
  SHORELINE: { base: 'base_grass' },

  // Roads
  DIRT_PATH: { base: 'base_dirt' },
  GRAVEL_ROAD: { base: 'base_dirt' },
  WOODEN_BRIDGE: { base: 'base_dirt' },
  STONE_BRIDGE: { base: 'base_dirt' },
  TRADE_ROUTE: { base: 'base_dirt' },
};

// Kenney base tiles are 120×140 with the hex face on top; the face is a
// near-regular hexagon 120 wide. Source rect for "just the face".
const SRC_W = 120;
const SRC_FACE_H = (SRC_W / Math.sqrt(3)) * 2; // ≈138.6

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

/**
 * Tint a base tile per pixel: each pixel becomes `tint × (lum / meanLum)`,
 * so the texture detail survives while the *average* tile color lands exactly
 * on the palette color. (Canvas `ctx.filter` grayscale is unsupported in
 * Safari/WebKit, so this is done manually.)
 */
function makeTintedBase(img: HTMLImageElement, tintHex: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, c.width, c.height);
  const d = image.data;

  let sum = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 16) {
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      n++;
    }
  }
  const mean = Math.max(1, sum / Math.max(1, n));

  const tr = parseInt(tintHex.slice(1, 3), 16);
  const tg = parseInt(tintHex.slice(3, 5), 16);
  const tb = parseInt(tintHex.slice(5, 7), 16);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const f = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / mean;
    d[i] = Math.min(255, tr * f);
    d[i + 1] = Math.min(255, tg * f);
    d[i + 2] = Math.min(255, tb * f);
  }
  ctx.putImageData(image, 0, 0);
  return c;
}

export interface TileSpriteAtlas {
  /** Hex circumradius the sprites were baked at (for scale on blit). */
  hexSize: number;
  /** Face-center position inside each sprite canvas. */
  anchorX: number;
  anchorY: number;
  /** Deterministic variant for a coord. */
  pick(terrain: TerrainType, q: number, r: number): HTMLCanvasElement;
}

function bakeVariant(
  terrain: TerrainType,
  variant: number,
  images: Map<string, HTMLImageElement>,
  tintedBase: HTMLCanvasElement,
): HTMLCanvasElement {
  const spec = TERRAIN_2D[terrain];
  const S = SPRITE_HEX_SIZE;
  const W = Math.ceil(Math.sqrt(3) * S);
  const H = 2 * S;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H + SPRITE_TOP_MARGIN;
  const ctx = canvas.getContext('2d')!;
  const cx = W / 2;
  const cy = SPRITE_TOP_MARGIN + S;

  // Clip to the exact pointy-top grid hexagon so tiles seam perfectly.
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    const px = cx + S * Math.cos(a);
    const py = cy + S * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();

  // Pre-tinted base texture — Kenney speckle/shading detail at the exact
  // palette hue (see makeTintedBase).
  ctx.drawImage(tintedBase, 0, 0, SRC_W, SRC_FACE_H, cx - W / 2, cy - S, W, H);
  ctx.restore();

  // Stamp object sprites (outside the clip so trees may overflow the top).
  if (spec.objects && spec.objects.length > 0) {
    const rand = mulberry32(variant * 1013904223 + terrain.length * 2654435761 + terrain.charCodeAt(0));
    const span = (spec.max ?? 1) - (spec.min ?? 0);
    const count = (spec.min ?? 0) + Math.round(rand() * span);
    const placed: Array<{ img: HTMLImageElement; x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const name = spec.objects[Math.floor(rand() * spec.objects.length)];
      const img = images.get(name)!;
      const ox = spec.centered ? 0 : (rand() - 0.5) * W * 0.55;
      const oy = spec.centered ? S * 0.3 : (rand() * 0.65 - 0.15) * S;
      placed.push({ img, x: cx + ox, y: cy + oy });
    }
    // Painter's order inside the tile: lower objects draw over higher ones.
    placed.sort((a, b) => a.y - b.y);
    const targetH = (spec.objectScale ?? 0.42) * H;
    for (const p of placed) {
      const h = targetH;
      const w = (p.img.width / p.img.height) * h;
      // Anchor at bottom-center so objects "stand" on the tile.
      ctx.drawImage(p.img, p.x - w / 2, p.y - h, w, h);
    }
  }

  return canvas;
}

/** Load the Kenney images and bake one sprite set per terrain. */
export async function bakeTileSprites(): Promise<TileSpriteAtlas> {
  const names = new Set<string>();
  for (const spec of Object.values(TERRAIN_2D)) {
    names.add(spec.base);
    for (const o of spec.objects ?? []) names.add(o);
  }
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...names].map(async (n) => {
      images.set(n, await loadImage(`/tiles2d/${n}.png`));
    }),
  );

  const sprites = new Map<TerrainType, HTMLCanvasElement[]>();
  for (const terrain of Object.keys(TERRAIN_2D) as TerrainType[]) {
    const tintedBase = makeTintedBase(
      images.get(TERRAIN_2D[terrain].base)!,
      terrainColors[terrain],
    );
    const variants: HTMLCanvasElement[] = [];
    for (let v = 0; v < VARIANTS; v++) variants.push(bakeVariant(terrain, v, images, tintedBase));
    sprites.set(terrain, variants);
  }

  return {
    hexSize: SPRITE_HEX_SIZE,
    anchorX: Math.ceil(Math.sqrt(3) * SPRITE_HEX_SIZE) / 2,
    anchorY: SPRITE_TOP_MARGIN + SPRITE_HEX_SIZE,
    pick(terrain, q, r) {
      const variants = sprites.get(terrain)!;
      return variants[hashCoord(q, r, 7) % variants.length];
    },
  };
}
