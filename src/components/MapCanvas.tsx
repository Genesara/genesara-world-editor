import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Shape, Stage, Rect, Line } from 'react-konva';
import type Konva from 'konva';
import type { Node, StarterNode, TerrainType } from '../types';
import { terrainColors } from '../constants/terrainColors';
import { raceColorFor } from '../constants/raceColors';
import { normalizeRaceId } from '../utils/enums';
import { keyOf } from '../utils/keyOf';
import type { HexGridApi } from '../hooks/useHexGrid';
import { bakeTileSprites, type TileSpriteAtlas } from '../utils/tiles2d';
import styles from './MapCanvas.module.css';

interface MapCanvasProps {
  hexApi: HexGridApi;
  nodes: Map<string, Node>;
  dirty: Map<string, Node>;
  selectedTerrain: TerrainType;
  /** Starter mappings for the *current* world, used to render markers on tiles in this region. */
  starters: StarterNode[];
  /** Lookup by hex tile id for tiles in the currently loaded region. */
  tilesById: Map<number, Node>;
  onPaint: (q: number, r: number) => void;
  onPaintMany: (coords: Array<{ q: number; r: number }>) => void;
  onHoverChange: (info: { q: number; r: number; terrain: TerrainType | null } | null) => void;
  onZoomChange: (zoom: number) => void;
  /** Right-click on a tile. (q, r) is the axial coord; sx/sy are screen (clientX/Y) for menu anchoring. */
  onTileContextMenu: (q: number, r: number, sx: number, sy: number) => void;
  loading: boolean;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export function MapCanvas({
  hexApi,
  nodes,
  dirty,
  selectedTerrain,
  starters,
  tilesById,
  onPaint,
  onPaintMany,
  onHoverChange,
  onZoomChange,
  onTileContextMenu,
  loading,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<{ q: number; r: number } | null>(null);
  const [selectRect, setSelectRect] = useState<null | {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>(null);

  // Kenney tile sprites bake asynchronously; until then hexes fall back to
  // flat palette fills.
  const [sprites, setSprites] = useState<TileSpriteAtlas | null>(null);
  useEffect(() => {
    let alive = true;
    bakeTileSprites().then(
      (atlas) => {
        if (alive) setSprites(atlas);
      },
      () => {
        /* keep flat-fill fallback if assets fail to load */
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // mode tracking via refs so pointermove isn't recreating handlers
  const modeRef = useRef<null | 'paint' | 'pan' | 'select'>(null);
  const lastPaintRef = useRef<string | null>(null);
  const panOriginRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Observe container size so the Stage always fills its slot.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    return () => ro.disconnect();
  }, []);

  // Recenter whenever the grid geometry changes.
  const boundsKey = `${hexApi.bounds.minX},${hexApi.bounds.minY},${hexApi.bounds.maxX},${hexApi.bounds.maxY}`;
  useEffect(() => {
    const midX = (hexApi.bounds.minX + hexApi.bounds.maxX) / 2;
    const midY = (hexApi.bounds.minY + hexApi.bounds.maxY) / 2;
    setPosition({ x: size.width / 2 - midX * scale, y: size.height / 2 - midY * scale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, size.width, size.height]);

  // Notify parent of zoom changes
  useEffect(() => {
    onZoomChange(scale);
  }, [scale, onZoomChange]);

  const worldFromStage = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - position.x) / scale,
      y: (sy - position.y) / scale,
    }),
    [position.x, position.y, scale],
  );

  const paintAt = useCallback(
    (worldX: number, worldY: number) => {
      const hex = hexApi.pointToAxial(worldX, worldY);
      if (!hex) return;
      const k = keyOf(hex.q, hex.r);
      if (lastPaintRef.current === k) return;
      lastPaintRef.current = k;
      onPaint(hex.q, hex.r);
    },
    [hexApi, onPaint],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pt = stage.getPointerPosition();
      if (!pt) return;
      const world = worldFromStage(pt.x, pt.y);
      const evt = e.evt;
      if (evt.shiftKey) {
        modeRef.current = 'select';
        setSelectRect({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
        return;
      }
      const hex = hexApi.pointToAxial(world.x, world.y);
      if (hex) {
        modeRef.current = 'paint';
        lastPaintRef.current = null;
        paintAt(world.x, world.y);
      } else {
        modeRef.current = 'pan';
        panOriginRef.current = {
          x: pt.x,
          y: pt.y,
          startX: position.x,
          startY: position.y,
        };
      }
    },
    [hexApi, paintAt, position.x, position.y, worldFromStage],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pt = stage.getPointerPosition();
      if (!pt) return;
      const world = worldFromStage(pt.x, pt.y);
      const hex = hexApi.pointToAxial(world.x, world.y);

      // update hover
      if (hex) {
        if (!hovered || hovered.q !== hex.q || hovered.r !== hex.r) {
          setHovered(hex);
          const node = nodes.get(keyOf(hex.q, hex.r));
          onHoverChange({ q: hex.q, r: hex.r, terrain: node?.terrain ?? null });
        }
      } else if (hovered) {
        setHovered(null);
        onHoverChange(null);
      }

      if (modeRef.current === 'paint') {
        paintAt(world.x, world.y);
      } else if (modeRef.current === 'pan' && panOriginRef.current) {
        const o = panOriginRef.current;
        setPosition({ x: o.startX + (pt.x - o.x), y: o.startY + (pt.y - o.y) });
      } else if (modeRef.current === 'select' && selectRect) {
        setSelectRect({ ...selectRect, x2: world.x, y2: world.y });
      }
    },
    [hexApi, hovered, nodes, onHoverChange, paintAt, selectRect, worldFromStage],
  );

  const handleMouseUp = useCallback(() => {
    if (modeRef.current === 'select' && selectRect) {
      const xmin = Math.min(selectRect.x1, selectRect.x2);
      const xmax = Math.max(selectRect.x1, selectRect.x2);
      const ymin = Math.min(selectRect.y1, selectRect.y2);
      const ymax = Math.max(selectRect.y1, selectRect.y2);
      const inside: Array<{ q: number; r: number }> = [];
      for (const { q, r } of hexApi.coordinates) {
        const { cx, cy } = hexApi.geometry(q, r);
        if (cx >= xmin && cx <= xmax && cy >= ymin && cy <= ymax) {
          inside.push({ q, r });
        }
      }
      if (inside.length) onPaintMany(inside);
    }
    modeRef.current = null;
    lastPaintRef.current = null;
    panOriginRef.current = null;
    setSelectRect(null);
  }, [hexApi, onPaintMany, selectRect]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const evt = e.evt;

      // Ctrl/Cmd + wheel → zoom toward cursor
      if (evt.ctrlKey || evt.metaKey) {
        const oldScale = scale;
        const pt = stage.getPointerPosition();
        if (!pt) return;
        const mouseWorld = {
          x: (pt.x - position.x) / oldScale,
          y: (pt.y - position.y) / oldScale,
        };
        const direction = evt.deltaY > 0 ? -1 : 1;
        const factor = 1 + direction * 0.12;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor));
        setScale(newScale);
        setPosition({
          x: pt.x - mouseWorld.x * newScale,
          y: pt.y - mouseWorld.y * newScale,
        });
        return;
      }

      // Otherwise wheel pans the canvas. Trackpads deliver both axes at once;
      // Shift + wheel forces horizontal pan for one-axis mouse wheels.
      const dx = evt.shiftKey ? evt.deltaY : evt.deltaX;
      const dy = evt.shiftKey ? 0 : evt.deltaY;
      setPosition((p) => ({ x: p.x - dx, y: p.y - dy }));
    },
    [position.x, position.y, scale],
  );

  // Build a fast lookup of hovered key
  const hoveredKey = hovered ? keyOf(hovered.q, hovered.r) : null;
  const hoveredGeom = hovered ? hexApi.geometry(hovered.q, hovered.r) : null;

  // Row-sorted nodes so sprite overflow (trees poking above their hex)
  // overlaps the row behind, painter-style.
  const sortedNodes = useMemo(
    () => [...nodes.values()].sort((a, b) => a.r - b.r || a.q - b.q),
    [nodes],
  );

  // Memoize references used inside sceneFunc for closure stability
  const drawHexes = useMemo(() => {
    const showGridLines = scale > 1.0;
    return (ctx: Konva.Context) => {
      // No fill all-at-once: we must paint per-hex with its own sprite/color.
      for (const node of sortedNodes) {
        const g = hexApi.geometry(node.q, node.r);
        if (sprites) {
          const sprite = sprites.pick(node.terrain, node.q, node.r);
          const k = hexApi.size / sprites.hexSize;
          ctx.drawImage(
            sprite,
            g.cx - sprites.anchorX * k,
            g.cy - sprites.anchorY * k,
            sprite.width * k,
            sprite.height * k,
          );
        } else {
          ctx.beginPath();
          const c = g.corners;
          ctx.moveTo(c[0], c[1]);
          for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1]);
          ctx.closePath();
          ctx.fillStyle = terrainColors[node.terrain];
          ctx.fill();
        }
        if (showGridLines) {
          ctx.beginPath();
          const c = g.corners;
          ctx.moveTo(c[0], c[1]);
          for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1]);
          ctx.closePath();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.stroke();
        }
      }
    };
    // sceneFunc signature in Konva is (ctx, shape) but we only need ctx here.
  }, [sortedNodes, hexApi, scale, sprites]);

  const drawDirty = useMemo(() => {
    return (ctx: Konva.Context) => {
      for (const node of dirty.values()) {
        const g = hexApi.geometry(node.q, node.r);
        ctx.beginPath();
        ctx.arc(g.cx, g.cy - hexApi.size * 0.55, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#1f1f1f';
        ctx.stroke();
      }
    };
  }, [dirty, hexApi]);

  // Group starters by tile id so multiple races on the same tile can stack visually.
  const startersInRegion = useMemo(() => {
    const out = new Map<number, string[]>();
    for (const s of starters) {
      const tile = tilesById.get(s.nodeId);
      if (!tile) continue;
      const list = out.get(s.nodeId) ?? [];
      list.push(normalizeRaceId(s.raceId));
      out.set(s.nodeId, list);
    }
    return out;
  }, [starters, tilesById]);

  const drawStarters = useMemo(() => {
    return (ctx: Konva.Context) => {
      for (const [tileId, races] of startersInRegion.entries()) {
        const tile = tilesById.get(tileId);
        if (!tile) continue;
        const g = hexApi.geometry(tile.q, tile.r);
        const r = hexApi.size * 0.32;
        // If multiple races spawn on the same tile, fan them along the X axis.
        const spread = (races.length - 1) * r * 0.6;
        races.forEach((raceId, i) => {
          const x = g.cx - spread / 2 + i * (r * 0.6);
          ctx.beginPath();
          ctx.arc(x, g.cy, r, 0, Math.PI * 2);
          ctx.fillStyle = raceColorFor(raceId);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.stroke();
        });
      }
    };
  }, [startersInRegion, tilesById, hexApi]);

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const native = e.evt;
      native.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pt = stage.getPointerPosition();
      if (!pt) return;
      const world = worldFromStage(pt.x, pt.y);
      const hex = hexApi.pointToAxial(world.x, world.y);
      if (!hex) return;
      // cancel any in-flight paint started by the same gesture
      modeRef.current = null;
      lastPaintRef.current = null;
      onTileContextMenu(hex.q, hex.r, native.clientX, native.clientY);
    },
    [hexApi, onTileContextMenu, worldFromStage],
  );

  return (
    <div
      ref={containerRef}
      className={styles.root}
      // Suppress browser context menu over the canvas (Stage's onContextMenu only fires for tile hits).
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <Layer listening={false}>
          <Shape
            sceneFunc={(ctx, shape) => {
              drawHexes(ctx);
              ctx.fillStrokeShape(shape);
            }}
            hitFunc={() => {
              /* no-op: we do hit detection in JS via honeycomb-grid */
            }}
          />
        </Layer>
        <Layer listening={false}>
          {hoveredGeom && (
            <Line
              points={hoveredGeom.corners}
              closed
              stroke="#c8a35e"
              strokeWidth={2 / scale}
            />
          )}
          {dirty.size > 0 && (
            <Shape
              sceneFunc={(ctx, shape) => {
                drawDirty(ctx);
                ctx.fillStrokeShape(shape);
              }}
              hitFunc={() => {}}
            />
          )}
          {startersInRegion.size > 0 && (
            <Shape
              sceneFunc={(ctx, shape) => {
                drawStarters(ctx);
                ctx.fillStrokeShape(shape);
              }}
              hitFunc={() => {}}
            />
          )}
          {selectRect && (
            <Rect
              x={Math.min(selectRect.x1, selectRect.x2)}
              y={Math.min(selectRect.y1, selectRect.y2)}
              width={Math.abs(selectRect.x2 - selectRect.x1)}
              height={Math.abs(selectRect.y2 - selectRect.y1)}
              stroke="#c8a35e"
              strokeWidth={1.5 / scale}
              dash={[6 / scale, 4 / scale]}
              fill="rgba(200,163,94,0.12)"
            />
          )}
        </Layer>
      </Stage>

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
        {hoveredKey && <span className={styles.hoverHint}> · hover {hoveredKey}</span>}
      </div>
    </div>
  );
}
