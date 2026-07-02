import * as THREE from 'three';
import type { DecorationKind } from './decorations';

/**
 * Geometry factory for the 3D hex world. Everything is plain three.js
 * primitives — cones, icosahedra, cylinders, planes, hex prisms — so the look
 * stays unified and the renderer can instance every shape.
 */

const POINTY_TOP_OFFSET = -Math.PI / 6;

/** Hexagonal prism centered on the origin, base at y=0, top at y=height. */
export function makeHexPrism(radius: number, height: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, height, 6);
  g.rotateY(POINTY_TOP_OFFSET);
  g.translate(0, height / 2, 0);
  return g;
}

/** Flat hexagonal disc on the XZ plane (normal points up), at y=0. */
export function makeHexDisc(radius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i;
    const x = radius * Math.cos(a);
    const y = radius * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Slightly raised, slightly larger ring around the hex top — fakes a chamfered rim that catches light. */
export function makeHexRim(outerRadius: number, innerRadius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i;
    const ox = outerRadius * Math.cos(a);
    const oy = outerRadius * Math.sin(a);
    if (i === 0) shape.moveTo(ox, oy);
    else shape.lineTo(ox, oy);
  }
  shape.closePath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i;
    const ix = innerRadius * Math.cos(a);
    const iy = innerRadius * Math.sin(a);
    if (i === 0) hole.moveTo(ix, iy);
    else hole.lineTo(ix, iy);
  }
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Merge a list of geometries into one buffer (positions + normals + indices). */
function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geoms) {
    g.computeVertexNormals();
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    totalVerts += g.attributes.position.count;
    totalIndices += g.index!.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);
  let pOff = 0;
  let iOff = 0;
  let baseIdx = 0;
  for (const g of geoms) {
    const pos = g.attributes.position.array as Float32Array;
    const nrm = g.attributes.normal.array as Float32Array;
    positions.set(pos, pOff * 3);
    normals.set(nrm, pOff * 3);
    const idx = g.index!.array as ArrayLike<number>;
    for (let i = 0; i < idx.length; i++) indices[iOff + i] = idx[i] + baseIdx;
    baseIdx += g.attributes.position.count;
    pOff += g.attributes.position.count;
    iOff += idx.length;
  }
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/**
 * Build the canonical mesh geometry for a decoration kind. The result is in
 * unit world coords (≈ 1 unit tall for trees, smaller for ground props) and
 * the renderer scales each instance from the decoration spec.
 */
export function makeDecorationGeometry(kind: DecorationKind): THREE.BufferGeometry {
  switch (kind) {
    case 'pine': {
      const lower = new THREE.ConeGeometry(0.55, 1.0, 8);
      lower.translate(0, 0.5, 0);
      const upper = new THREE.ConeGeometry(0.4, 0.7, 8);
      upper.translate(0, 1.05, 0);
      return mergeGeometries([lower, upper]);
    }
    case 'birch': {
      const trunk = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
      trunk.translate(0, 0.25, 0);
      const top = new THREE.ConeGeometry(0.45, 0.75, 8);
      top.translate(0, 0.85, 0);
      return mergeGeometries([trunk, top]);
    }
    case 'boulder': {
      const ico = new THREE.IcosahedronGeometry(0.45, 0);
      ico.translate(0, 0.4, 0);
      return ico;
    }
    case 'mountain_cap': {
      const lower = new THREE.IcosahedronGeometry(0.7, 0);
      lower.translate(0, 0.55, 0);
      const upper = new THREE.IcosahedronGeometry(0.45, 0);
      upper.translate(0.1, 1.05, 0.05);
      return mergeGeometries([lower, upper]);
    }
    case 'mountain_snow_cap': {
      const lower = new THREE.IcosahedronGeometry(0.7, 0);
      lower.translate(0, 0.55, 0);
      const upper = new THREE.IcosahedronGeometry(0.45, 0);
      upper.translate(0.05, 1.05, -0.05);
      return mergeGeometries([lower, upper]);
    }
    case 'cactus': {
      const trunk = new THREE.CylinderGeometry(0.18, 0.22, 1.0, 6);
      trunk.translate(0, 0.5, 0);
      const arm = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6);
      arm.translate(0.25, 0.7, 0);
      return mergeGeometries([trunk, arm]);
    }
    case 'ice_shard': {
      const g = new THREE.IcosahedronGeometry(0.35, 0);
      g.scale(1, 1.5, 1);
      g.translate(0, 0.3, 0);
      return g;
    }
    case 'lava_pool': {
      const g = new THREE.SphereGeometry(0.4, 12, 8);
      g.scale(1, 0.45, 1);
      g.translate(0, 0.05, 0);
      return g;
    }
    case 'reed': {
      const stalk = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 5);
      stalk.translate(0, 0.35, 0);
      return stalk;
    }
    case 'water_shimmer': {
      // Slightly larger than the hex top so it covers any seam.
      return makeHexDisc(0.96);
    }
    case 'broken_column': {
      const g = new THREE.CylinderGeometry(0.18, 0.2, 0.55, 8);
      g.translate(0, 0.27, 0);
      return g;
    }
    case 'crystal': {
      const a = new THREE.ConeGeometry(0.18, 0.9, 5);
      a.translate(0, 0.45, 0);
      const b = new THREE.ConeGeometry(0.14, 0.6, 5);
      b.translate(0.18, 0.3, 0.1);
      const c = new THREE.ConeGeometry(0.12, 0.5, 5);
      c.translate(-0.15, 0.25, -0.12);
      return mergeGeometries([a, b, c]);
    }
    case 'blight_thorn': {
      const a = new THREE.ConeGeometry(0.22, 0.6, 6);
      a.translate(0, 0.3, 0);
      a.rotateX(0.18);
      a.rotateZ(-0.12);
      return a;
    }
    case 'bridge_plank': {
      const g = new THREE.BoxGeometry(1.6, 0.12, 0.5);
      g.translate(0, 0.06, 0);
      return g;
    }
  }
}
