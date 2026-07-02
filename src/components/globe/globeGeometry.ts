import * as THREE from 'three';
import type { Biome, ClimateType, GlobeNode, Vec3 } from '../../types';
import { isCreatedNode } from '../../types';
import { biomeColorFor } from '../../constants/biomeColors';
import { climateColorFor } from '../../constants/climateColors';

const BIOME_WEIGHT = 0.7;
const CLIMATE_WEIGHT = 0.3;

export interface MeshGeometry {
  geometry: THREE.BufferGeometry;
  triangleToSphereIndex: Uint32Array;
}

function scaleOutward(v: Vec3, offset: number): Vec3 {
  if (offset === 0) return v;
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  const k = (m + offset) / m;
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

export function blendedFaceColor(
  biome: Biome,
  climate: ClimateType,
  out: THREE.Color = new THREE.Color(),
): THREE.Color {
  const t = new THREE.Color(biomeColorFor(biome));
  const c = new THREE.Color(climateColorFor(climate));
  out.setRGB(
    t.r * BIOME_WEIGHT + c.r * CLIMATE_WEIGHT,
    t.g * BIOME_WEIGHT + c.g * CLIMATE_WEIGHT,
    t.b * BIOME_WEIGHT + c.b * CLIMATE_WEIGHT,
  );
  return out;
}

interface BuildOptions {
  radiusOffset?: number;
  withColors?: boolean;
  withCentroidAttr?: boolean;
}

function buildFromNodes(nodes: GlobeNode[], opts: BuildOptions): MeshGeometry {
  const radiusOffset = opts.radiusOffset ?? 0;
  const positions: number[] = [];
  const colors: number[] = [];
  const centroids: number[] = [];
  const triToIdx: number[] = [];
  const tmpColor = new THREE.Color();

  for (const node of nodes) {
    const verts = node.face_vertices;
    const c = node.centroid;
    const cc = scaleOutward(c, radiusOffset);

    let r = 1;
    let g = 1;
    let b = 1;
    if (opts.withColors) {
      if (isCreatedNode(node)) {
        blendedFaceColor(node.biome, node.climate, tmpColor);
        r = tmpColor.r;
        g = tmpColor.g;
        b = tmpColor.b;
      }
    }

    for (let i = 0; i < verts.length; i++) {
      const a = cc;
      const bv = scaleOutward(verts[i], radiusOffset);
      const d = scaleOutward(verts[(i + 1) % verts.length], radiusOffset);
      positions.push(a.x, a.y, a.z, bv.x, bv.y, bv.z, d.x, d.y, d.z);
      if (opts.withColors) {
        colors.push(r, g, b, r, g, b, r, g, b);
      }
      if (opts.withCentroidAttr) {
        centroids.push(c.x, c.y, c.z, c.x, c.y, c.z, c.x, c.y, c.z);
      }
      triToIdx.push(node.sphere_index);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  if (opts.withColors) {
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(colors), 3),
    );
  }
  if (opts.withCentroidAttr) {
    geometry.setAttribute(
      'aCentroid',
      new THREE.BufferAttribute(new Float32Array(centroids), 3),
    );
  }
  geometry.computeVertexNormals();

  return {
    geometry,
    triangleToSphereIndex: new Uint32Array(triToIdx),
  };
}

export function buildEmptyMeshGeometry(allNodes: GlobeNode[]): MeshGeometry {
  const empty = allNodes.filter((n) => !isCreatedNode(n));
  return buildFromNodes(empty, { withColors: false });
}

export function buildCreatedBaseGeometry(allNodes: GlobeNode[]): MeshGeometry {
  const created = allNodes.filter(isCreatedNode);
  return buildFromNodes(created, { withColors: true });
}

export function buildClimateEffectGeometry(
  allNodes: GlobeNode[],
  climate: ClimateType,
): MeshGeometry {
  const matching = allNodes.filter(
    (n) => isCreatedNode(n) && n.climate === climate,
  );
  return buildFromNodes(matching, {
    radiusOffset: 0.003,
    withCentroidAttr: true,
  });
}

export function buildFaceEdgesGeometry(
  nodes: GlobeNode[],
  radiusOffset = 0.004,
): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const node of nodes) {
    const verts = node.face_vertices;
    for (let i = 0; i < verts.length; i++) {
      const a = scaleOutward(verts[i], radiusOffset);
      const b = scaleOutward(verts[(i + 1) % verts.length], radiusOffset);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(pts), 3),
  );
  return geometry;
}

export function disposeMeshGeometry(m: MeshGeometry | null): void {
  m?.geometry.dispose();
}
