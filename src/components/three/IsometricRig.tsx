import { useEffect, useRef } from 'react';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

interface Props {
  /** Half-extent of the area the camera should frame (world units). */
  frameRadius: number;
  /** Allow free orbit. When false, the camera is locked to the isometric preset. */
  freeOrbit: boolean;
  /** Min/max orthographic zoom. */
  minZoom?: number;
  maxZoom?: number;
}

const ISO_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();

/**
 * Orthographic isometric camera + lights. The camera is positioned along the
 * unit (1,1,1) direction so all three world axes foreshorten equally — the
 * classic strategy/RPG isometric look. OrbitControls handles pan/zoom; rotate
 * is gated by `freeOrbit`.
 */
export function IsometricRig({ frameRadius, freeOrbit, minZoom = 0.5, maxZoom = 4 }: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Reserve LEFT mouse button for painting. MIDDLE always pans; RIGHT pans in
  // locked mode and rotates when free orbit is on. Set via ref because the
  // declarative prop's type forbids `null`/`undefined` for individual buttons.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // three's OrbitControls accepts undefined to disable a button at runtime
    // even though the type lists MOUSE only.
    (controls.mouseButtons as { LEFT: unknown; MIDDLE: unknown; RIGHT: unknown }) = {
      LEFT: undefined,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: freeOrbit ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
    };
  }, [freeOrbit]);

  // When the user toggles back from free orbit, snap to the isometric preset.
  useEffect(() => {
    if (freeOrbit) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const target = controls.target;
    const distance = frameRadius * 4;
    controls.object.position.set(
      target.x + ISO_DIRECTION.x * distance,
      target.y + ISO_DIRECTION.y * distance,
      target.z + ISO_DIRECTION.z * distance,
    );
    controls.object.up.set(0, 1, 0);
    controls.update();
  }, [freeOrbit, frameRadius]);

  const half = frameRadius;

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[ISO_DIRECTION.x * half * 4, ISO_DIRECTION.y * half * 4, ISO_DIRECTION.z * half * 4]}
        zoom={1}
        near={-half * 20}
        far={half * 20}
        left={-half}
        right={half}
        top={half * 0.7}
        bottom={-half * 0.7}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate={freeOrbit}
        enablePan
        enableZoom
        minZoom={minZoom}
        maxZoom={maxZoom}
        screenSpacePanning
      />
      <ambientLight color="#B8C4D4" intensity={0.45} />
      <directionalLight
        color="#FFE8C4"
        position={[half * 0.8, half * 1.4, half * 0.6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-half * 1.5}
        shadow-camera-right={half * 1.5}
        shadow-camera-top={half * 1.5}
        shadow-camera-bottom={-half * 1.5}
        shadow-camera-near={0.1}
        shadow-camera-far={half * 10}
      />
    </>
  );
}
