import * as THREE from 'three';

/**
 * Pointy-top axial (q, r) → world (x, 0, z) for the 3D view.
 *
 * Matches honeycomb-grid's POINTY orientation so the 3D layout aligns 1:1 with
 * the 2D Konva editor (which also uses POINTY at the same HEX_SIZE). z is the
 * world-up axis used by the 2D Y; tiles sit on the XZ plane with their tops
 * facing +Y.
 */
export function axialToWorld(q: number, r: number, size: number): { x: number; z: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const z = size * (3 / 2) * r;
  return { x, z };
}

/** Outer radius of the 3D hex tile in world units. Picked to match the 2D HEX_SIZE. */
export const HEX_3D_SIZE = 1;

/** Default extrusion / prism height for a procedural tile. */
export const HEX_3D_HEIGHT = 0.4;

/**
 * Build a shared pointy-top hex prism geometry, oriented so the flat top faces
 * +Y. Reused (via instancing) for every visible tile to keep draw calls bounded.
 */
export function makeHexPrismGeometry(
  outerRadius = HEX_3D_SIZE,
  height = HEX_3D_HEIGHT,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90); // pointy-top: first corner at angle -90°
    const x = outerRadius * Math.cos(angle);
    const y = outerRadius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });

  // ExtrudeGeometry extrudes along +Z by default; rotate so the top faces +Y
  // and the flat base sits on the XZ plane at y = 0.
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, height, 0);
  geom.computeVertexNormals();
  return geom;
}
