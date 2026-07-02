import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { GlobeNode } from '../../types';

const COLOR_EXISTING = new THREE.Color('#6a9466'); // friendly green
const COLOR_DRAFT_CREATE = new THREE.Color('#c8a35e'); // accent
const COLOR_DRAFT_DELETE = new THREE.Color('#c46a52'); // hostile

const RADIUS_OFFSET = 0.004;

interface Props {
  nodes: Map<number, GlobeNode>;
  /** sphereIndices that already host a zone (loaded from server) */
  existing: Set<number>;
  /** sphereIndices the operator queued for creation */
  draftCreate: Set<number>;
  /** sphereIndices whose existing zone is queued for deletion */
  draftDelete: Set<number>;
}

function buildOverlayGeometry(faces: { node: GlobeNode; color: THREE.Color }[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const { node, color } of faces) {
    const v = node.face_vertices;
    const c = node.centroid;
    const m = Math.hypot(c.x, c.y, c.z) || 1;
    const k = (m + RADIUS_OFFSET) / m;
    const cx = c.x * k,
      cy = c.y * k,
      cz = c.z * k;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const am = Math.hypot(a.x, a.y, a.z) || 1;
      const bm = Math.hypot(b.x, b.y, b.z) || 1;
      const ak = (am + RADIUS_OFFSET) / am;
      const bk = (bm + RADIUS_OFFSET) / bm;
      positions.push(cx, cy, cz, a.x * ak, a.y * ak, a.z * ak, b.x * bk, b.y * bk, b.z * bk);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  geom.computeVertexNormals();
  return geom;
}

export function ZoneLayer({ nodes, existing, draftCreate, draftDelete }: Props) {
  const geometry = useMemo(() => {
    const faces: { node: GlobeNode; color: THREE.Color }[] = [];
    for (const sphereIndex of existing) {
      if (draftDelete.has(sphereIndex)) continue; // shown as delete instead
      const node = nodes.get(sphereIndex);
      if (node) faces.push({ node, color: COLOR_EXISTING });
    }
    for (const sphereIndex of draftDelete) {
      const node = nodes.get(sphereIndex);
      if (node) faces.push({ node, color: COLOR_DRAFT_DELETE });
    }
    for (const sphereIndex of draftCreate) {
      const node = nodes.get(sphereIndex);
      if (node) faces.push({ node, color: COLOR_DRAFT_CREATE });
    }
    return buildOverlayGeometry(faces);
  }, [nodes, existing, draftCreate, draftDelete]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (geometry.attributes.position.count === 0) return null;

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
