/**
 * Three.js/R3F Goldberg polyhedron globe.
 *
 * Geometry strategy:
 *   - Build one BufferGeometry by fan-triangulating every face (N-2 triangles
 *     per face: vertices[0], vertices[k], vertices[k+1]).
 *   - Store a parallel `triangleFaceIndex` array so hit-testing can map
 *     triangle index → face index.
 *   - Per-face colour is computed by combining overlay layers and written into
 *     a Float32Array color attribute. On overlay change we recompute only the
 *     color array, avoiding a full geometry rebuild.
 *   - Pentagon faces (the 12 icosahedron vertices) get a subtle hue shift
 *     (-8° on the blue channel) to distinguish them visually.
 */

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GoldbergFace, GoldbergMesh } from '@/lib/globe/goldberg';
import type { OverlayData } from './useGlobeOverlays';
import type { NpcZone } from '@/lib/api/worlds';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (mirrored from tailwind config, used in Three.js colour math)
// ─────────────────────────────────────────────────────────────────────────────

// Base face colour: bg-bg-raised → hsl(220 14% 10%)
const BASE_H = 220 / 360;
const BASE_S = 0.14;
const BASE_L = 0.10;

// Selected face: slightly brighter raised surface
const SELECTED_L = 0.22;
const SELECTED_S = 0.18;

// Pentagon subtle shift: nudge hue -0.022 rad (≈ -8°)
const PENTAGON_H_SHIFT = -0.022;

// Agent presence dot: accent hsl(214 100% 60%)
const PRESENCE_H = 214 / 360;
const PRESENCE_S = 1.0;
const PRESENCE_L = 0.60;

// Density tint: warning hsl(38 92% 56%) but very subtle
const DENSITY_H = 38 / 360;
const DENSITY_S = 0.92;
const DENSITY_L = 0.56;

// Zone highlight colours — deterministic from zoneId hash
function zoneColor(zoneId: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < zoneId.length; i++) h = (h * 31 + zoneId.charCodeAt(i)) & 0xffffffff;
  const hue = ((h >>> 0) % 360) / 360;
  return [hue, 0.70, 0.55];
}

// ─────────────────────────────────────────────────────────────────────────────
// hsl → rgb conversion
// ─────────────────────────────────────────────────────────────────────────────

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const hi = Math.floor(h * 6);
  if (hi === 0) { r = c; g = x; }
  else if (hi === 1) { r = x; g = c; }
  else if (hi === 2) { g = c; b = x; }
  else if (hi === 3) { g = x; b = c; }
  else if (hi === 4) { r = x; b = c; }
  else { r = c; b = x; }
  return [r + m, g + m, b + m];
}

// Blend two rgb triples with weight t ∈ [0,1]
function blendRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour computation for one face
// ─────────────────────────────────────────────────────────────────────────────

interface OverlayFlags {
  showZones: boolean;
  showDensity: boolean;
  showPresence: boolean;
}

interface OverlayMaps {
  zoneByNode: Map<number, NpcZone>;
  density: Map<number, number>;
  presence: Map<number, number>;
}

function computeFaceColor(
  face: GoldbergFace,
  selectedIndex: number | null,
  hoveredIndex: number | null,
  flags: OverlayFlags,
  maps: OverlayMaps,
): [number, number, number] {
  const isSelected = face.index === selectedIndex;
  const isHovered = face.index === hoveredIndex;

  // Base colour with optional pentagon hue shift
  const baseH = BASE_H + (face.isPentagon ? PENTAGON_H_SHIFT : 0);
  const baseL = isSelected ? SELECTED_L : isHovered ? BASE_L + 0.07 : BASE_L;
  const baseS = isSelected ? SELECTED_S : isHovered ? BASE_S + 0.06 : BASE_S;

  let rgb = hsl2rgb(baseH, baseS, baseL);

  // Zone overlay (node-scoped zones only at v1)
  if (flags.showZones) {
    const zone = maps.zoneByNode.get(face.index);
    if (zone) {
      const [zh, zs, zl] = zoneColor(zone.zoneId);
      const zoneRgb = hsl2rgb(zh, zs, zl);
      rgb = blendRgb(rgb, zoneRgb, 0.30);
    }
  }

  // Density heatmap
  if (flags.showDensity) {
    const d = maps.density.get(face.index) ?? 0;
    if (d > 0) {
      const densityRgb = hsl2rgb(DENSITY_H, DENSITY_S, DENSITY_L);
      rgb = blendRgb(rgb, densityRgb, d * 0.45);
    }
  }

  // Agent presence tint
  if (flags.showPresence) {
    const p = maps.presence.get(face.index) ?? 0;
    if (p > 0) {
      const presenceRgb = hsl2rgb(PRESENCE_H, PRESENCE_S, PRESENCE_L);
      rgb = blendRgb(rgb, presenceRgb, Math.min(1, p * 0.4));
    }
  }

  return rgb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build geometry from Goldberg mesh
// ─────────────────────────────────────────────────────────────────────────────

interface GlobeGeometry {
  geometry: THREE.BufferGeometry;
  /** triangle index → face index */
  triangleFaceMap: Int32Array;
  faceTriangleStart: Int32Array; // first triangle index for face i
  faceTriangleCount: Int32Array; // triangle count for face i
  totalTriangles: number;
}

function buildGlobeGeometry(mesh: GoldbergMesh): GlobeGeometry {
  const faces = mesh.faces;

  // Count total triangles first
  let totalTriangles = 0;
  for (const face of faces) {
    totalTriangles += face.vertices.length - 2; // fan triangulation
  }

  const positions = new Float32Array(totalTriangles * 3 * 3); // x,y,z per vertex
  const colors = new Float32Array(totalTriangles * 3 * 3);    // r,g,b per vertex
  const normals = new Float32Array(totalTriangles * 3 * 3);

  const triangleFaceMap = new Int32Array(totalTriangles);
  const faceTriangleStart = new Int32Array(faces.length);
  const faceTriangleCount = new Int32Array(faces.length);

  let triOffset = 0;

  for (const face of faces) {
    const verts = face.vertices;
    const n = verts.length;
    const triCount = n - 2;

    faceTriangleStart[face.index] = triOffset;
    faceTriangleCount[face.index] = triCount;

    // Fan from verts[0]
    for (let k = 1; k <= triCount; k++) {
      const v0 = verts[0];
      const v1 = verts[k];
      const v2 = verts[k + 1];

      const base = (triOffset) * 9;

      positions[base + 0] = v0.x; positions[base + 1] = v0.y; positions[base + 2] = v0.z;
      positions[base + 3] = v1.x; positions[base + 4] = v1.y; positions[base + 5] = v1.z;
      positions[base + 6] = v2.x; positions[base + 7] = v2.y; positions[base + 8] = v2.z;

      // Normal = centroid direction (outward on unit sphere)
      normals[base + 0] = face.centroid.x; normals[base + 1] = face.centroid.y; normals[base + 2] = face.centroid.z;
      normals[base + 3] = face.centroid.x; normals[base + 4] = face.centroid.y; normals[base + 5] = face.centroid.z;
      normals[base + 6] = face.centroid.x; normals[base + 7] = face.centroid.y; normals[base + 8] = face.centroid.z;

      // Default color (will be overwritten by updateColors)
      colors[base + 0] = BASE_L; colors[base + 1] = BASE_L; colors[base + 2] = BASE_L;
      colors[base + 3] = BASE_L; colors[base + 4] = BASE_L; colors[base + 5] = BASE_L;
      colors[base + 6] = BASE_L; colors[base + 7] = BASE_L; colors[base + 8] = BASE_L;

      triangleFaceMap[triOffset] = face.index;
      triOffset++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  return { geometry, triangleFaceMap, faceTriangleStart, faceTriangleCount, totalTriangles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update only the colour attribute in-place (no geometry rebuild needed)
// ─────────────────────────────────────────────────────────────────────────────

function updateColors(
  geometry: THREE.BufferGeometry,
  faces: GoldbergFace[],
  faceTriangleStart: Int32Array,
  faceTriangleCount: Int32Array,
  selectedIndex: number | null,
  hoveredIndex: number | null,
  flags: OverlayFlags,
  maps: OverlayMaps,
) {
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const buf = colorAttr.array as Float32Array;

  for (const face of faces) {
    const [r, g, b] = computeFaceColor(face, selectedIndex, hoveredIndex, flags, maps);
    const triStart = faceTriangleStart[face.index];
    const triCount = faceTriangleCount[face.index];
    for (let t = 0; t < triCount; t++) {
      const base = (triStart + t) * 9;
      buf[base + 0] = r; buf[base + 1] = g; buf[base + 2] = b;
      buf[base + 3] = r; buf[base + 4] = g; buf[base + 5] = b;
      buf[base + 6] = r; buf[base + 7] = g; buf[base + 8] = b;
    }
  }
  colorAttr.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GlobeMesh — the renderable mesh inside <Canvas>
// ─────────────────────────────────────────────────────────────────────────────

interface GlobeMeshProps {
  mesh: GoldbergMesh;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  flags: OverlayFlags;
  maps: OverlayMaps;
}

function GlobeMesh({
  mesh,
  selectedIndex,
  hoveredIndex,
  onHover,
  onSelect,
  flags,
  maps,
}: GlobeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Build geometry once on mount
  const globeGeo = useMemo(() => buildGlobeGeometry(mesh), [mesh]);

  // Recompute colours whenever any overlay dep changes
  useEffect(() => {
    updateColors(
      globeGeo.geometry,
      mesh.faces,
      globeGeo.faceTriangleStart,
      globeGeo.faceTriangleCount,
      selectedIndex,
      hoveredIndex,
      flags,
      maps,
    );
  }, [globeGeo, mesh.faces, selectedIndex, hoveredIndex, flags, maps]);

  // Slow idle rotation — OrbitControls will override when user interacts
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.04;
    }
  });

  // R3F ThreeEvent carries faceIndex from the intersection directly
  const getFaceFromEvent = useCallback(
    (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>): number | null => {
      if (e.faceIndex === undefined || e.faceIndex === null) return null;
      // faceIndex in an un-indexed BufferGeometry is the triangle index
      return globeGeo.triangleFaceMap[e.faceIndex] ?? null;
    },
    [globeGeo.triangleFaceMap],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      onHover(getFaceFromEvent(e));
    },
    [getFaceFromEvent, onHover],
  );

  const handlePointerLeave = useCallback(() => onHover(null), [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const fi = getFaceFromEvent(e);
      if (fi !== null) onSelect(fi);
    },
    [getFaceFromEvent, onSelect],
  );

  return (
    <mesh
      ref={meshRef}
      geometry={globeGeo.geometry}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <meshLambertMaterial vertexColors side={THREE.FrontSide} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — wraps the Canvas
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobeSceneProps {
  mesh: GoldbergMesh;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  overlayData: OverlayData;
  showZones: boolean;
  showDensity: boolean;
  showPresence: boolean;
}

export function GlobeScene({
  mesh,
  selectedIndex,
  hoveredIndex,
  onHover,
  onSelect,
  overlayData,
  showZones,
  showDensity,
  showPresence,
}: GlobeSceneProps) {
  const flags: OverlayFlags = { showZones, showDensity, showPresence };

  // Build overlay maps for quick lookup
  const maps = useMemo<OverlayMaps>(() => {
    const zoneByNode = new Map<number, NpcZone>();
    for (const zone of overlayData.zones) {
      if (zone.scope === 'NODE' && zone.nodeId !== undefined) {
        zoneByNode.set(zone.nodeId, zone);
      }
    }
    return {
      zoneByNode,
      density: overlayData.buildingDensity,
      presence: overlayData.agentPresence,
    };
  }, [overlayData]);

  return (
    <Canvas
      className="bg-bg-canvas"
      camera={{ position: [0, 0, 2.8], fov: 45 }}
      gl={{ antialias: true }}
    >
      {/* Subtle ambient + directional — no glare */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={0.7} castShadow={false} />

      <GlobeMesh
        mesh={mesh}
        selectedIndex={selectedIndex}
        hoveredIndex={hoveredIndex}
        onHover={onHover}
        onSelect={onSelect}
        flags={flags}
        maps={maps}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}
