import { useMemo } from 'react';
import { defineHex, Grid, Orientation, spiral } from 'honeycomb-grid';

export interface HexGeometry {
  /** Center of the hex in pixel space */
  cx: number;
  cy: number;
  /** Corner points as flat [x0, y0, x1, y1, ...] for Konva */
  corners: number[];
}

export interface HexGridApi {
  /** honeycomb-grid class so callers can instantiate ad-hoc hexes */
  Hex: ReturnType<typeof defineHex>;
  /** Full iterable grid (hex-shaped) */
  grid: Grid<InstanceType<ReturnType<typeof defineHex>>>;
  /** Axial coords of all hexes in the grid */
  coordinates: Array<{ q: number; r: number }>;
  /** Geometry for a given q,r — used by the renderer */
  geometry: (q: number, r: number) => HexGeometry;
  /** Hex size in pixels (outer radius) */
  size: number;
  /** Axial coord from pixel position; null if outside grid */
  pointToAxial: (x: number, y: number) => { q: number; r: number } | null;
  /** Approximate pixel bounds of the grid */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface UseHexGridOpts {
  radius: number;
  size?: number;
}

export function useHexGrid({ radius, size = 20 }: UseHexGridOpts): HexGridApi {
  return useMemo(() => {
    const Hex = defineHex({ dimensions: size, orientation: Orientation.POINTY });
    const grid = new Grid(Hex, spiral({ radius }));

    const coordinates: Array<{ q: number; r: number }> = [];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    grid.forEach((hex) => {
      coordinates.push({ q: hex.q, r: hex.r });
      for (const c of hex.corners) {
        if (c.x < minX) minX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.x > maxX) maxX = c.x;
        if (c.y > maxY) maxY = c.y;
      }
    });

    const geometryCache = new Map<string, HexGeometry>();
    const geometry = (q: number, r: number): HexGeometry => {
      const key = `${q},${r}`;
      const cached = geometryCache.get(key);
      if (cached) return cached;
      const hex = new Hex({ q, r });
      const corners: number[] = [];
      for (const c of hex.corners) corners.push(c.x, c.y);
      const g: HexGeometry = { cx: hex.x, cy: hex.y, corners };
      geometryCache.set(key, g);
      return g;
    };

    const pointToAxial = (x: number, y: number): { q: number; r: number } | null => {
      const hex = grid.pointToHex({ x, y }, { allowOutside: false });
      if (!hex) return null;
      return { q: hex.q, r: hex.r };
    };

    return {
      Hex,
      grid,
      coordinates,
      geometry,
      size,
      pointToAxial,
      bounds: { minX, minY, maxX, maxY },
    };
  }, [radius, size]);
}
