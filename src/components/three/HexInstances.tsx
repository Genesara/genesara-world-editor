import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Node, TerrainType } from '../../types';
import { axialToWorld, HEX_3D_SIZE } from '../../utils/hexTo3D';
import { terrainTiles } from '../../utils/terrainTiles';
import { decorations, type DecorationSpec } from '../../utils/decorations';
import { makeDecorationGeometry, makeHexDisc, makeHexPrism, makeHexRim } from '../../utils/hexGeometry';

const RIM_HEIGHT = 0.04;
const RIM_LIGHTEN = 0.08;

const TMP_MATRIX = new THREE.Matrix4();
const TMP_QUAT = new THREE.Quaternion();
const TMP_POS = new THREE.Vector3();
const TMP_SCALE = new THREE.Vector3();

/** Cheap deterministic hash of an axial coord. */
function hashCoord(q: number, r: number, salt: number): number {
  let h = ((q | 0) * 73856093) ^ ((r | 0) * 19349663) ^ (salt * 83492791);
  h ^= h >>> 16;
  return Math.abs(h | 0);
}

/** Lighten a hex color by a 0–1 factor (toward white). */
function lighten(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amount);
  return `#${c.getHexString()}`;
}

/* -------------------------------------------------------------------------- */
/*  Hex prism group (one per terrain)                                         */
/* -------------------------------------------------------------------------- */

interface PrismProps {
  terrain: TerrainType;
  hexes: Node[];
}

function HexPrismGroup({ terrain, hexes }: PrismProps) {
  const tile = terrainTiles[terrain];

  const sideGeom = useMemo(() => makeHexPrism(HEX_3D_SIZE, tile.height), [tile.height]);
  const topGeom = useMemo(() => makeHexDisc(HEX_3D_SIZE * 0.998), []);
  const rimGeom = useMemo(
    () => makeHexRim(HEX_3D_SIZE * 1.005, HEX_3D_SIZE * 0.94),
    [],
  );

  // Dispose geometries when they're replaced.
  useEffect(() => () => sideGeom.dispose(), [sideGeom]);
  useEffect(() => () => topGeom.dispose(), [topGeom]);
  useEffect(() => () => rimGeom.dispose(), [rimGeom]);

  const sideRef = useRef<THREE.InstancedMesh>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);
  const rimRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const sm = sideRef.current;
    const tm = topRef.current;
    const rm = rimRef.current;
    if (!sm || !tm || !rm) return;
    hexes.forEach((node, i) => {
      const { x, z } = axialToWorld(node.q, node.r, HEX_3D_SIZE);
      TMP_MATRIX.makeTranslation(x, 0, z);
      sm.setMatrixAt(i, TMP_MATRIX);
      TMP_MATRIX.makeTranslation(x, tile.height + 0.001, z);
      tm.setMatrixAt(i, TMP_MATRIX);
      TMP_MATRIX.makeTranslation(x, tile.height + RIM_HEIGHT, z);
      rm.setMatrixAt(i, TMP_MATRIX);
    });
    sm.instanceMatrix.needsUpdate = true;
    tm.instanceMatrix.needsUpdate = true;
    rm.instanceMatrix.needsUpdate = true;
    sm.count = hexes.length;
    tm.count = hexes.length;
    rm.count = hexes.length;
  }, [hexes, tile.height]);

  return (
    <group>
      <instancedMesh
        ref={sideRef}
        args={[sideGeom, undefined, Math.max(hexes.length, 1)]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={tile.sideColor}
          roughness={tile.roughness}
          metalness={0}
        />
      </instancedMesh>
      <instancedMesh
        ref={topRef}
        args={[topGeom, undefined, Math.max(hexes.length, 1)]}
        receiveShadow
      >
        <meshStandardMaterial
          color={tile.topColor}
          roughness={tile.roughness}
          metalness={0}
        />
      </instancedMesh>
      <instancedMesh
        ref={rimRef}
        args={[rimGeom, undefined, Math.max(hexes.length, 1)]}
      >
        <meshStandardMaterial
          color={lighten(tile.topColor, RIM_LIGHTEN)}
          roughness={Math.max(0, tile.roughness - 0.1)}
          metalness={0}
        />
      </instancedMesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Decoration group (one per terrain that has a decoration)                  */
/* -------------------------------------------------------------------------- */

interface DecorationProps {
  terrain: TerrainType;
  hexes: Node[];
}

interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotationY: number;
}

function placementsFor(spec: DecorationSpec, terrain: TerrainType, hexes: Node[]): Placement[] {
  const out: Placement[] = [];
  const top = terrainTiles[terrain].height;
  for (const node of hexes) {
    const spawn = hashCoord(node.q, node.r, 1) % 100;
    if (spawn >= spec.chance) continue;
    const { x, z } = axialToWorld(node.q, node.r, HEX_3D_SIZE);
    for (let i = 0; i < spec.count; i++) {
      const h = hashCoord(node.q, node.r, 100 + i);
      const angle = ((h >>> 8) % 1024) / 1024 * Math.PI * 2;
      const dist =
        spec.kind === 'water_shimmer' || spec.kind === 'bridge_plank'
          ? 0
          : (((h >>> 4) % 1024) / 1024) * HEX_3D_SIZE * 0.45;
      const jitter = ((h & 0xff) / 255 - 0.5) * 0.25; // ±12.5%
      out.push({
        x: x + Math.cos(angle) * dist,
        y: top,
        z: z + Math.sin(angle) * dist,
        scale: spec.scale * (1 + jitter),
        rotationY: ((h >>> 16) & 0x3ff) / 1024 * Math.PI * 2,
      });
    }
  }
  return out;
}

function DecorationGroup({ terrain, hexes }: DecorationProps) {
  const spec = decorations[terrain];
  const geom = useMemo(() => (spec ? makeDecorationGeometry(spec.kind) : null), [spec]);
  useEffect(() => () => geom?.dispose(), [geom]);

  const placements = useMemo(
    () => (spec ? placementsFor(spec, terrain, hexes) : []),
    [spec, terrain, hexes],
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    placements.forEach((p, i) => {
      TMP_POS.set(p.x, p.y, p.z);
      TMP_QUAT.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotationY);
      TMP_SCALE.set(p.scale, p.scale, p.scale);
      TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
      mesh.setMatrixAt(i, TMP_MATRIX);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = placements.length;
  }, [placements]);

  if (!spec || !geom || placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geom, undefined, Math.max(placements.length, 1)]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={spec.color}
        roughness={spec.roughness ?? 0.85}
        metalness={spec.metalness ?? 0}
        emissive={spec.emissive ?? '#000000'}
        emissiveIntensity={spec.emissiveIntensity ?? 0}
      />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Top-level                                                                  */
/* -------------------------------------------------------------------------- */

interface Props {
  nodes: Map<string, Node>;
}

export function HexInstances({ nodes }: Props) {
  const grouped = useMemo(() => {
    const out = new Map<TerrainType, Node[]>();
    for (const node of nodes.values()) {
      const list = out.get(node.terrain);
      if (list) list.push(node);
      else out.set(node.terrain, [node]);
    }
    return out;
  }, [nodes]);

  return (
    <group>
      {Array.from(grouped.entries()).map(([terrain, list]) => (
        <HexPrismGroup key={`prism-${terrain}`} terrain={terrain} hexes={list} />
      ))}
      {Array.from(grouped.entries()).map(([terrain, list]) => (
        <DecorationGroup key={`dec-${terrain}`} terrain={terrain} hexes={list} />
      ))}
    </group>
  );
}
