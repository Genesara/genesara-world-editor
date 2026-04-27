import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { ClimateType, GlobeNode } from '../../types';
import { isCreatedNode } from '../../types';
import { allClimates } from '../../constants/climateGroups';
import { EMPTY_FACE_COLOR } from '../../constants/climateColors';
import {
  buildClimateEffectGeometry,
  buildCreatedBaseGeometry,
  buildEmptyMeshGeometry,
  buildFaceEdgesGeometry,
  type MeshGeometry,
} from './globeGeometry';
import { createClimateMaterial, type ClimateMaterialSpec } from './climateShaders';

const DIMMED_OPACITY = 0.3;
const DIMMED_EFFECT_OPACITY = 0.08;

interface ContextMenuPayload {
  sphereIndex: number;
  clientX: number;
  clientY: number;
}

interface Props {
  nodes: Map<number, GlobeNode>;
  selectedIndex: number | null;
  hoveredIndex: number | null;
  highlightClimate: ClimateType | null;
  onHover: (sphereIndex: number | null) => void;
  onSelect: (sphereIndex: number) => void;
  onContextMenu: (payload: ContextMenuPayload) => void;
}

export function GlobeMesh({
  nodes,
  selectedIndex,
  hoveredIndex,
  highlightClimate,
  onHover,
  onSelect,
  onContextMenu,
}: Props) {
  const allNodes = useMemo(() => Array.from(nodes.values()), [nodes]);

  const emptyMesh = useMemo(() => buildEmptyMeshGeometry(allNodes), [allNodes]);
  const createdBaseMesh = useMemo(() => buildCreatedBaseGeometry(allNodes), [allNodes]);

  const emptyEdgesGeometry = useMemo(() => {
    const empty = allNodes.filter((n) => !isCreatedNode(n));
    return buildFaceEdgesGeometry(empty);
  }, [allNodes]);

  const matchingBaseMesh = useMemo(() => {
    if (!highlightClimate) return null;
    const subset = allNodes.filter(
      (n) => isCreatedNode(n) && n.climate === highlightClimate,
    );
    return buildCreatedBaseGeometry(subset);
  }, [allNodes, highlightClimate]);

  const effectMeshes = useMemo(() => {
    const out = new Map<ClimateType, MeshGeometry>();
    for (const c of allClimates) {
      out.set(c, buildClimateEffectGeometry(allNodes, c));
    }
    return out;
  }, [allNodes]);

  // Dispose old geometries when memo replaces them.
  useEffect(() => () => emptyMesh.geometry.dispose(), [emptyMesh]);
  useEffect(() => () => createdBaseMesh.geometry.dispose(), [createdBaseMesh]);
  useEffect(() => () => emptyEdgesGeometry.dispose(), [emptyEdgesGeometry]);
  useEffect(() => {
    if (!matchingBaseMesh) return;
    return () => matchingBaseMesh.geometry.dispose();
  }, [matchingBaseMesh]);
  useEffect(() => {
    return () => {
      for (const m of effectMeshes.values()) m.geometry.dispose();
    };
  }, [effectMeshes]);

  // Persistent climate materials (shared across geometry rebuilds).
  const climateMaterialsRef = useRef<Map<ClimateType, ClimateMaterialSpec> | null>(null);
  if (climateMaterialsRef.current === null) {
    const m = new Map<ClimateType, ClimateMaterialSpec>();
    for (const c of allClimates) m.set(c, createClimateMaterial(c));
    climateMaterialsRef.current = m;
  }
  const climateMaterials = climateMaterialsRef.current;

  useEffect(() => {
    return () => {
      for (const spec of climateMaterials.values()) spec.material.dispose();
    };
  }, [climateMaterials]);

  // Drive animated effect uniforms.
  useFrame((_state, delta) => {
    for (const spec of climateMaterials.values()) {
      if (spec.isAnimated) spec.material.uniforms.uTime.value += delta;
    }
  });

  // Update opacity uniforms based on highlight state.
  useEffect(() => {
    for (const [climate, spec] of climateMaterials.entries()) {
      const target = highlightClimate == null || highlightClimate === climate ? 1.0 : DIMMED_EFFECT_OPACITY;
      spec.material.uniforms.uOpacity.value = target;
    }
  }, [highlightClimate, climateMaterials]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const faceIndex = e.faceIndex;
    if (faceIndex == null) return;
    const lookup = (e.object as THREE.Mesh).userData
      ?.triangleToSphereIndex as Uint32Array | undefined;
    if (!lookup) return;
    const sphereIndex = lookup[faceIndex];
    if (sphereIndex == null) return;
    if (sphereIndex !== hoveredIndex) onHover(sphereIndex);
  };

  const handlePointerOut = () => {
    onHover(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const faceIndex = e.faceIndex;
    if (faceIndex == null) return;
    const lookup = (e.object as THREE.Mesh).userData
      ?.triangleToSphereIndex as Uint32Array | undefined;
    if (!lookup) return;
    const sphereIndex = lookup[faceIndex];
    if (sphereIndex == null) return;
    e.stopPropagation();
    onSelect(sphereIndex);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    const faceIndex = e.faceIndex;
    if (faceIndex == null) return;
    const lookup = (e.object as THREE.Mesh).userData
      ?.triangleToSphereIndex as Uint32Array | undefined;
    if (!lookup) return;
    const sphereIndex = lookup[faceIndex];
    if (sphereIndex == null) return;
    e.nativeEvent.preventDefault();
    e.stopPropagation();
    onContextMenu({
      sphereIndex,
      clientX: e.nativeEvent.clientX,
      clientY: e.nativeEvent.clientY,
    });
  };

  const dimBase = highlightClimate != null;

  const highlightFaces = useMemo(() => {
    const out: Array<{ key: string; vertices: [number, number, number][]; color: string }> = [];
    if (hoveredIndex != null) {
      const node = nodes.get(hoveredIndex);
      if (node) {
        out.push({
          key: `hover-${hoveredIndex}`,
          vertices: node.face_vertices,
          color: '#ffffff',
        });
      }
    }
    if (selectedIndex != null && selectedIndex !== hoveredIndex) {
      const node = nodes.get(selectedIndex);
      if (node) {
        out.push({
          key: `sel-${selectedIndex}`,
          vertices: node.face_vertices,
          color: '#ffd166',
        });
      }
    }
    return out;
  }, [hoveredIndex, selectedIndex, nodes]);

  return (
    <>
      {/* Empty faces */}
      <mesh
        geometry={emptyMesh.geometry}
        userData={{ triangleToSphereIndex: emptyMesh.triangleToSphereIndex }}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <meshStandardMaterial
          color={EMPTY_FACE_COLOR}
          flatShading
          roughness={0.92}
          metalness={0}
          transparent={dimBase}
          opacity={dimBase ? DIMMED_OPACITY : 1.0}
        />
      </mesh>

      {/* Subtle grid showing empty-face borders */}
      <lineSegments geometry={emptyEdgesGeometry} raycast={() => null}>
        <lineBasicMaterial
          color="#3a4a5c"
          transparent
          opacity={dimBase ? 0.12 : 0.45}
          depthWrite={false}
        />
      </lineSegments>

      {/* Created faces – base blended color */}
      <mesh
        geometry={createdBaseMesh.geometry}
        userData={{ triangleToSphereIndex: createdBaseMesh.triangleToSphereIndex }}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.85}
          metalness={0}
          transparent={dimBase}
          opacity={dimBase ? DIMMED_OPACITY : 1.0}
        />
      </mesh>

      {/* Highlighted matching faces – brought back to full opacity on top */}
      {matchingBaseMesh && (
        <mesh
          geometry={matchingBaseMesh.geometry}
          renderOrder={1}
          raycast={() => null}
        >
          <meshStandardMaterial
            vertexColors
            flatShading
            roughness={0.85}
            metalness={0}
          />
        </mesh>
      )}

      {/* Climate effect overlays */}
      {Array.from(effectMeshes.entries()).map(([climate, mesh]) => {
        const spec = climateMaterials.get(climate);
        if (!spec || mesh.triangleToSphereIndex.length === 0) return null;
        return (
          <mesh
            key={climate}
            geometry={mesh.geometry}
            material={spec.material}
            renderOrder={2}
            raycast={() => null}
          />
        );
      })}

      {highlightFaces.map((h) => (
        <FaceOutline key={h.key} vertices={h.vertices} color={h.color} />
      ))}
    </>
  );
}

function FaceOutline({
  vertices,
  color,
}: {
  vertices: [number, number, number][];
  color: string;
}) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const expand = (v: [number, number, number]) => {
      const m = Math.hypot(v[0], v[1], v[2]) || 1;
      const k = (m + 0.005) / m;
      return [v[0] * k, v[1] * k, v[2] * k] as [number, number, number];
    };
    for (let i = 0; i < vertices.length; i++) {
      const ea = expand(vertices[i]);
      const eb = expand(vertices[(i + 1) % vertices.length]);
      pts.push(ea[0], ea[1], ea[2], eb[0], eb[1], eb[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [vertices]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={3}>
      <lineBasicMaterial color={color} linewidth={2} depthTest={false} transparent />
    </lineSegments>
  );
}
