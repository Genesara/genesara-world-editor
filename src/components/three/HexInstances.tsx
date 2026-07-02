import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Node } from '../../types';
import { axialToWorld, HEX_3D_SIZE } from '../../utils/hexTo3D';
import { terrainTiles } from '../../utils/terrainTiles';
import {
  TERRAIN_GLB,
  TILE_RADIUS_K,
  WATER_TERRAIN,
  placeProps,
  type PlacedProp,
  type TileForProps,
} from '../../utils/terrainProps3D';

// KayKit Medieval Hexagon Pack geometry (public/models/terrain.glb, see
// public/CREDITS-ASSETS.md). Tiles render as two instanced draws (land
// prism, sunken water tile) with per-instance terrain tint; props render as
// one instanced draw per prop type with the original KayKit atlas. Draw
// calls stay constant no matter how many tiles are painted.
useGLTF.preload(TERRAIN_GLB);

const _obj = new THREE.Object3D();
const _color = new THREE.Color();

// Visuals never raycast — hover/paint picking is HexPickerLayer's job.
const noRaycast: THREE.Mesh['raycast'] = () => {};

// terrain.glb is baked flat-top; the editor grid is pointy-top. Hexes have
// 6-fold symmetry, so a 30° turn about Y converts one to the other.
const FLAT_TO_POINTY = Math.PI / 6;

interface TilePlacement {
  x: number;
  z: number;
  height: number;
  color: string;
}

function TileLayer({
  tiles,
  geometry,
  material,
}: {
  tiles: TilePlacement[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = HEX_3D_SIZE * TILE_RADIUS_K;
    tiles.forEach((t, i) => {
      // Geometry top sits at y=0 with a unit-deep skirt, so translating to
      // the tile height and y-scaling by the same lands the base at y=0.
      _obj.position.set(t.x, t.height, t.z);
      _obj.rotation.set(0, 0, 0);
      _obj.scale.set(r, t.height, r);
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
      mesh.setColorAt(i, _color.set(t.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles]);

  if (tiles.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, tiles.length]}
      castShadow
      receiveShadow
      raycast={noRaycast}
    />
  );
}

function PropLayer({
  geometry,
  material,
  list,
  tinted,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  list: PlacedProp[];
  tinted: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    list.forEach((p, i) => {
      _obj.position.set(p.x, p.y, p.z);
      _obj.rotation.set(0, p.rotation, 0);
      _obj.scale.setScalar(p.scale);
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
      // Tinted props carry the tile color; atlas props keep authored colors.
      mesh.setColorAt(i, tinted ? _color.set(p.tileColor) : _color.set('#ffffff'));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [list, tinted]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, list.length]}
      castShadow
      receiveShadow
      raycast={noRaycast}
    />
  );
}

interface Props {
  nodes: Map<string, Node>;
}

export function HexInstances({ nodes }: Props) {
  const { nodes: glbNodes, materials } = useGLTF(TERRAIN_GLB);

  const landGeom = useMemo(() => {
    const g = (glbNodes.tile_land as THREE.Mesh).geometry.clone();
    g.rotateY(FLAT_TO_POINTY);
    return g;
  }, [glbNodes]);
  const waterGeom = useMemo(() => {
    const g = (glbNodes.tile_water as THREE.Mesh).geometry.clone();
    g.rotateY(FLAT_TO_POINTY);
    return g;
  }, [glbNodes]);

  const landMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 }),
    [],
  );
  // Self-glow keeps water readable — the sunken tile sits in its neighbors'
  // shadow and a purely lit deep-blue tile collapses to near-black.
  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.25,
        emissive: '#2c4f73',
        emissiveIntensity: 0.85,
      }),
    [],
  );
  const tintedPropMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.04 }),
    [],
  );

  // Dispose the per-mount geometry clones and materials when replaced.
  useEffect(() => () => landGeom.dispose(), [landGeom]);
  useEffect(() => () => waterGeom.dispose(), [waterGeom]);
  useEffect(() => () => landMat.dispose(), [landMat]);
  useEffect(() => () => waterMat.dispose(), [waterMat]);
  useEffect(() => () => tintedPropMat.dispose(), [tintedPropMat]);

  const { land, water, propGroups } = useMemo(() => {
    const land: TilePlacement[] = [];
    const water: TilePlacement[] = [];
    const forProps: TileForProps[] = [];
    for (const node of nodes.values()) {
      const { x, z } = axialToWorld(node.q, node.r, HEX_3D_SIZE);
      const tile = terrainTiles[node.terrain];
      (WATER_TERRAIN.has(node.terrain) ? water : land).push({
        x,
        z,
        height: tile.height,
        color: tile.topColor,
      });
      forProps.push({
        q: node.q,
        r: node.r,
        terrain: node.terrain,
        x,
        z,
        height: tile.height,
        radius: HEX_3D_SIZE * TILE_RADIUS_K,
        colorHex: tile.topColor,
      });
    }
    const byGroup = new Map<string, PlacedProp[]>();
    for (const p of placeProps(forProps)) {
      const key = `${p.prop}|${p.tinted ? 't' : 'a'}`;
      const list = byGroup.get(key);
      if (list) list.push(p);
      else byGroup.set(key, [p]);
    }
    return { land, water, propGroups: [...byGroup.entries()] };
  }, [nodes]);

  return (
    <group>
      <TileLayer tiles={land} geometry={landGeom} material={landMat} />
      <TileLayer tiles={water} geometry={waterGeom} material={waterMat} />
      {propGroups.map(([key, list]) => (
        <PropLayer
          key={key}
          geometry={(glbNodes[list[0].prop] as THREE.Mesh).geometry}
          material={list[0].tinted ? tintedPropMat : materials.atlas}
          list={list}
          tinted={list[0].tinted}
        />
      ))}
    </group>
  );
}
