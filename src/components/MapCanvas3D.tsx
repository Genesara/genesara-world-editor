import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Node, StarterNode, TerrainType } from '../types';
import { terrainColors } from '../constants/terrainColors';
import { keyOf } from '../utils/keyOf';
import type { HexGridApi } from '../hooks/useHexGrid';
import { axialToWorld, HEX_3D_SIZE } from '../utils/hexTo3D';
import { IsometricRig } from './three/IsometricRig';
import { HexInstances } from './three/HexInstances';
import { HexPickerLayer } from './three/HexPickerLayer';
import { HoverHighlight } from './three/HoverHighlight';
import { StarterMarkers3D } from './three/StarterMarkers3D';
import { usePaintControls3D } from '../hooks/usePaintControls3D';
import styles from './MapCanvas3D.module.css';

interface Props {
  hexApi: HexGridApi;
  nodes: Map<string, Node>;
  selectedTerrain: TerrainType;
  /** Starter mappings for the current world. */
  starters: StarterNode[];
  /** Lookup by hex tile id for tiles in the currently loaded region. */
  tilesById: Map<number, Node>;
  onPaint: (q: number, r: number) => void;
  onHoverChange: (info: { q: number; r: number; terrain: TerrainType | null } | null) => void;
  onZoomChange: (zoom: number) => void;
  /** Right-click on a tile (q, r); sx/sy are clientX/Y for menu anchoring. */
  onTileContextMenu: (q: number, r: number, sx: number, sy: number) => void;
  loading: boolean;
}

/**
 * 3D isometric counterpart to MapCanvas. Same paint contract; renders the same
 * `nodes` Map as procedural extruded hex prisms in a Three.js scene.
 *
 * v1 supports hover + click + drag-paint. Selection rectangles and multi-tile
 * ops stay in the 2D editor for now.
 */
export function MapCanvas3D({
  hexApi,
  nodes,
  selectedTerrain,
  starters,
  tilesById,
  onPaint,
  onHoverChange,
  onZoomChange,
  onTileContextMenu,
  loading,
}: Props) {
  const [freeOrbit, setFreeOrbit] = useState(false);

  // Frame the camera around the actual extent of the spiral grid.
  const frameRadius = useMemo(() => {
    let max = 0;
    for (const c of hexApi.coordinates) {
      const { x, z } = axialToWorld(c.q, c.r, HEX_3D_SIZE);
      const r = Math.hypot(x, z);
      if (r > max) max = r;
    }
    return Math.max(max + HEX_3D_SIZE * 2, HEX_3D_SIZE * 6);
  }, [hexApi.coordinates]);

  useEffect(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  const handleHoverChange = useCallback(
    (info: { q: number; r: number } | null) => {
      if (!info) {
        onHoverChange(null);
        return;
      }
      const node = nodes.get(keyOf(info.q, info.r));
      onHoverChange({ q: info.q, r: info.r, terrain: node?.terrain ?? null });
    },
    [nodes, onHoverChange],
  );

  const { hovered, handlePointer } = usePaintControls3D({
    onPaint,
    onHoverChange: handleHoverChange,
  });

  return (
    <div
      className={styles.root}
      // Suppress the browser context menu when the right-click misses any tile picker.
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas className={styles.canvas} shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#1A2030']} />
        <IsometricRig frameRadius={frameRadius} freeOrbit={freeOrbit} />
        <HexInstances nodes={nodes} />
        <HexPickerLayer
          coordinates={hexApi.coordinates}
          onPointer={handlePointer}
          onContextMenu={({ q, r, sx, sy }) => onTileContextMenu(q, r, sx, sy)}
        />
        {hovered && <HoverHighlight q={hovered.q} r={hovered.r} />}
        <StarterMarkers3D starters={starters} tilesById={tilesById} />
        {/* Subtle ground plane catches the directional shadow under the world. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <circleGeometry args={[frameRadius * 1.4, 64]} />
          <meshStandardMaterial color="#11161F" roughness={1} metalness={0} />
        </mesh>
      </Canvas>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <div>Loading map…</div>
        </div>
      )}

      <div className={styles.selectedBadge}>
        <span
          className={styles.selectedSwatch}
          style={{ background: terrainColors[selectedTerrain] }}
        />
        Brush: <strong>{selectedTerrain.replace(/_/g, ' ')}</strong>
        {hovered && (
          <span className={styles.hoverHint}>
            {' '}
            · hover {hovered.q},{hovered.r}
          </span>
        )}
      </div>

      <label className={styles.orbitToggle}>
        <input
          type="checkbox"
          checked={freeOrbit}
          onChange={(e) => setFreeOrbit(e.target.checked)}
        />
        Free orbit
      </label>
    </div>
  );
}
