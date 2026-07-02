import { useMemo } from 'react';
import type { Node, StarterNode } from '../../types';
import { axialToWorld, HEX_3D_SIZE } from '../../utils/hexTo3D';
import { terrainTiles } from '../../utils/terrainTiles';
import { propClearance } from '../../utils/terrainProps3D';
import { raceColorFor } from '../../constants/raceColors';
import { normalizeRaceId } from '../../utils/enums';

interface Props {
  starters: StarterNode[];
  /** Lookup by hex tile id for tiles in the currently loaded region. */
  tilesById: Map<number, Node>;
}

/**
 * Floating colored sphere above each tile that hosts a starter for some race.
 * Multiple races on the same tile are stacked along +X with a small offset.
 */
export function StarterMarkers3D({ starters, tilesById }: Props) {
  const visible = useMemo(() => {
    // group by tile id so we can stack
    const byTile = new Map<number, string[]>();
    for (const s of starters) {
      const tile = tilesById.get(s.nodeId);
      if (!tile) continue;
      const list = byTile.get(s.nodeId) ?? [];
      list.push(normalizeRaceId(s.raceId));
      byTile.set(s.nodeId, list);
    }
    const out: Array<{ key: string; x: number; y: number; z: number; color: string }> = [];
    for (const [tileId, races] of byTile.entries()) {
      const tile = tilesById.get(tileId)!;
      const { x, z } = axialToWorld(tile.q, tile.r, HEX_3D_SIZE);
      // Clear whatever props sit on the tile (mountains, trees) so the
      // marker floats above the scenery instead of inside it.
      const top = terrainTiles[tile.terrain].height + propClearance(tile.terrain);
      const spread = (races.length - 1) * 0.18;
      races.forEach((raceId, i) => {
        out.push({
          key: `${tileId}-${raceId}`,
          x: x - spread / 2 + i * 0.18,
          y: top + 0.45,
          z,
          color: raceColorFor(raceId),
        });
      });
    }
    return out;
  }, [starters, tilesById]);

  return (
    <>
      {visible.map((m) => (
        <mesh key={m.key} position={[m.x, m.y, m.z]} renderOrder={3}>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial
            color={m.color}
            emissive={m.color}
            emissiveIntensity={0.45}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}
    </>
  );
}
