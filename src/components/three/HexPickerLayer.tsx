import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { axialToWorld, makeHexPrismGeometry, HEX_3D_SIZE } from '../../utils/hexTo3D';

const PICKER_GEOMETRY = makeHexPrismGeometry(HEX_3D_SIZE * 0.99, 0.05);

export type PointerKind = 'down' | 'move' | 'up';

interface Props {
  /** Full grid coordinates (every hex slot, painted or not). */
  coordinates: Array<{ q: number; r: number }>;
  onPointer: (kind: PointerKind, info: { q: number; r: number; buttons: number } | null) => void;
  /** Right-click on a tile: emits axial (q,r) and screen (clientX/Y) for menu anchoring. */
  onContextMenu?: (info: { q: number; r: number; sx: number; sy: number }) => void;
}

/**
 * Invisible flat hex prisms covering every hex slot in the spiral. Used purely
 * for raycasting / pointer events — separates picking from the visible tiles
 * so hover/paint is robust regardless of tile shape or height.
 */
export function HexPickerLayer({ coordinates, onPointer, onContextMenu }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const indexToCoord = useMemo(() => coordinates.slice(), [coordinates]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    coordinates.forEach((c, i) => {
      const { x, z } = axialToWorld(c.q, c.r, HEX_3D_SIZE);
      m.makeScale(1, 1, 1);
      m.setPosition(x, 0, z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = coordinates.length;
  }, [coordinates]);

  const handlePointer = (kind: PointerKind) => (e: ThreeEvent<PointerEvent>) => {
    const id = e.instanceId;
    if (id == null) {
      onPointer(kind, null);
      return;
    }
    const c = indexToCoord[id];
    if (!c) return;
    e.stopPropagation();
    onPointer(kind, { q: c.q, r: c.r, buttons: e.buttons });
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (!onContextMenu) return;
    const id = e.instanceId;
    if (id == null) return;
    const c = indexToCoord[id];
    if (!c) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    onContextMenu({
      q: c.q,
      r: c.r,
      sx: e.nativeEvent.clientX,
      sy: e.nativeEvent.clientY,
    });
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[PICKER_GEOMETRY, undefined, Math.max(coordinates.length, 1)]}
      onPointerDown={handlePointer('down')}
      onPointerMove={handlePointer('move')}
      onPointerUp={handlePointer('up')}
      onContextMenu={handleContextMenu}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}
