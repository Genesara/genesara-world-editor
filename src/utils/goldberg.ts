import type { Vec3 } from '../types';

export interface GoldbergFace {
  index: number;
  centroid: Vec3;
  vertices: Vec3[];
  neighbors: number[];
  isPentagon: boolean;
}

export interface GoldbergMesh {
  faces: GoldbergFace[];
  frequency: number;
}

const PHI = (1 + Math.sqrt(5)) / 2;

function normalize(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vertexKey(v: Vec3): string {
  const p = 1e6;
  return `${Math.round(v[0] * p)}|${Math.round(v[1] * p)}|${Math.round(v[2] * p)}`;
}

function baseIcosahedron(): { vertices: Vec3[]; faces: [number, number, number][] } {
  const t = PHI;
  const raw: Vec3[] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const vertices = raw.map(normalize);
  const faces: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return { vertices, faces };
}

interface GeodesicMesh {
  vertices: Vec3[];
  triangles: [number, number, number][];
  vertexTriangles: number[][];
  edgeMap: Map<string, [number, number]>;
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildGeodesic(T: number): GeodesicMesh {
  const base = baseIcosahedron();
  const vertices: Vec3[] = [];
  const vertexIndex = new Map<string, number>();

  const addVertex = (v: Vec3): number => {
    const n = normalize(v);
    const key = vertexKey(n);
    const existing = vertexIndex.get(key);
    if (existing !== undefined) return existing;
    const idx = vertices.length;
    vertices.push(n);
    vertexIndex.set(key, idx);
    return idx;
  };

  const triangles: [number, number, number][] = [];

  for (const [ia, ib, ic] of base.faces) {
    const A = base.vertices[ia];
    const B = base.vertices[ib];
    const C = base.vertices[ic];
    // For each (i, j, k) with i + j + k = T and i,j,k >= 0, compute the point.
    // Build a grid: grid[i][j] = vertex index at (i, j, T - i - j)
    const grid: number[][] = [];
    for (let i = 0; i <= T; i++) {
      grid[i] = [];
      for (let j = 0; j <= T - i; j++) {
        const k = T - i - j;
        const p: Vec3 = [
          (i * A[0] + j * B[0] + k * C[0]) / T,
          (i * A[1] + j * B[1] + k * C[1]) / T,
          (i * A[2] + j * B[2] + k * C[2]) / T,
        ];
        grid[i][j] = addVertex(p);
      }
    }
    // Emit sub-triangles preserving winding.
    for (let i = 0; i < T; i++) {
      for (let j = 0; j < T - i; j++) {
        const v00 = grid[i][j];
        const v10 = grid[i + 1][j];
        const v01 = grid[i][j + 1];
        triangles.push([v00, v10, v01]);
        if (j < T - i - 1) {
          const v11 = grid[i + 1][j + 1];
          triangles.push([v10, v11, v01]);
        }
      }
    }
  }

  const vertexTriangles: number[][] = vertices.map(() => []);
  const edgeMap = new Map<string, [number, number]>();
  triangles.forEach((tri, tIdx) => {
    const [a, b, c] = tri;
    vertexTriangles[a].push(tIdx);
    vertexTriangles[b].push(tIdx);
    vertexTriangles[c].push(tIdx);
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ] as [number, number][]) {
      const key = edgeKey(x, y);
      const cur = edgeMap.get(key);
      if (cur) cur[1] = tIdx;
      else edgeMap.set(key, [tIdx, -1]);
    }
  });

  return { vertices, triangles, vertexTriangles, edgeMap };
}

function triangleCentroid(tri: [number, number, number], verts: Vec3[]): Vec3 {
  const [a, b, c] = tri;
  return normalize([
    (verts[a][0] + verts[b][0] + verts[c][0]) / 3,
    (verts[a][1] + verts[b][1] + verts[c][1]) / 3,
    (verts[a][2] + verts[b][2] + verts[c][2]) / 3,
  ]);
}

function pickOrthogonal(n: Vec3): Vec3 {
  const ax = Math.abs(n[0]);
  const ay = Math.abs(n[1]);
  const az = Math.abs(n[2]);
  const ref: Vec3 = ax < ay && ax < az ? [1, 0, 0] : ay < az ? [0, 1, 0] : [0, 0, 1];
  const u = normalize(sub(ref, scale(n, dot(ref, n))));
  return u;
}

export function generateGoldberg(T: number): GoldbergMesh {
  if (T < 1 || !Number.isInteger(T)) {
    throw new Error(`generateGoldberg requires integer T >= 1, got ${T}`);
  }
  const geo = buildGeodesic(T);
  const triCentroids: Vec3[] = geo.triangles.map((tri) => triangleCentroid(tri, geo.vertices));

  // For each geodesic vertex build a Goldberg face.
  // First, compute raw faces (unsorted corners + raw neighbors from triangle adjacency).
  const faces: GoldbergFace[] = geo.vertices.map((v, vi) => {
    const tris = geo.vertexTriangles[vi];
    const corners: Vec3[] = tris.map((tIdx) => triCentroids[tIdx]);

    const u = pickOrthogonal(v);
    const w = normalize(cross(v, u));

    // Sort corners CCW around v in the tangent plane (u, w).
    const indexed = corners.map((c, i) => {
      const d = sub(c, v);
      return { i, angle: Math.atan2(dot(d, w), dot(d, u)) };
    });
    indexed.sort((a, b) => a.angle - b.angle);

    const sortedCorners: Vec3[] = indexed.map(({ i }) => corners[i]);
    const sortedTris: number[] = indexed.map(({ i }) => tris[i]);

    // Compute neighbors: neighbor k is opposite the edge between corner k and corner k+1.
    // That edge separates two triangles (sortedTris[k] and sortedTris[k+1]) which share
    // an edge containing v. The neighbor face is the *other* geodesic vertex on that shared edge.
    const neighbors: number[] = [];
    for (let k = 0; k < sortedTris.length; k++) {
      const tA = geo.triangles[sortedTris[k]];
      const tB = geo.triangles[sortedTris[(k + 1) % sortedTris.length]];
      // Find the vertex shared by tA and tB that is not v.
      const sharedInA = tA.filter((x) => x !== vi && tB.includes(x));
      if (sharedInA.length >= 1) {
        neighbors.push(sharedInA[0]);
      } else {
        neighbors.push(-1);
      }
    }

    // Centroid of the Goldberg face.
    const cSum: Vec3 = sortedCorners.reduce<Vec3>(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
      [0, 0, 0],
    );
    const centroid = normalize([
      cSum[0] / sortedCorners.length,
      cSum[1] / sortedCorners.length,
      cSum[2] / sortedCorners.length,
    ]);

    // Enforce outward winding (cross of first two edges points outward).
    const e1 = sub(sortedCorners[1], sortedCorners[0]);
    const e2 = sub(sortedCorners[2], sortedCorners[0]);
    const nrm = cross(e1, e2);
    if (dot(nrm, centroid) < 0) {
      sortedCorners.reverse();
      // Re-derive neighbors in reversed order so invariant still holds.
      neighbors.reverse();
      // After reversing corners, neighbor[k] should share edge (k, k+1). The reversal
      // requires a shift: if original neighbor[k] was between corner[k] and corner[k+1],
      // after reversal new corner k is old corner N-1-k; new edge (k,k+1) is old edge
      // (N-1-k, N-2-k) = old neighbor at index N-2-k. Shift by one:
      neighbors.push(neighbors.shift()!);
    }

    return {
      index: vi,
      centroid,
      vertices: sortedCorners,
      neighbors,
      isPentagon: sortedCorners.length === 5,
    };
  });

  if (import.meta.env?.DEV) {
    const pentCount = faces.filter((f) => f.isPentagon).length;
    if (pentCount !== 12) {
      // eslint-disable-next-line no-console
      console.warn(`[goldberg] expected 12 pentagons, got ${pentCount}`);
    }
    const expected = 10 * T * T + 2;
    if (faces.length !== expected) {
      // eslint-disable-next-line no-console
      console.warn(`[goldberg] expected ${expected} faces, got ${faces.length}`);
    }
  }

  return { faces, frequency: T };
}

/**
 * Maps a desired node count to the nearest Goldberg subdivision frequency T
 * that can actually be realized (10T^2 + 2 faces). Clamped to [2, 30].
 */
export function frequencyForNodeCount(nodeCount: number): number {
  const t = Math.round(Math.sqrt(Math.max(0, nodeCount - 2) / 10));
  return Math.min(30, Math.max(2, t));
}

export function faceCountForFrequency(T: number): number {
  return 10 * T * T + 2;
}
