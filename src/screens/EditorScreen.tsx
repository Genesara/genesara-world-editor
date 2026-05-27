import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GlobeNode, Node, RaceId, StarterNode, TerrainType } from '../types';
import { MapCanvas } from '../components/MapCanvas';
import { MapCanvas3D } from '../components/MapCanvas3D';
import { StarterContextMenu } from '../components/StarterContextMenu';
import { TerrainSidebar } from '../components/TerrainSidebar';
import { Toolbar, type EditorView } from '../components/Toolbar';
import { StatusBar } from '../components/StatusBar';
import { useHexGrid } from '../hooks/useHexGrid';
import { useDirtyTracker } from '../hooks/useDirtyTracker';
import { useMapApi } from '../hooks/useMapApi';
import { useGlobeApi } from '../hooks/useGlobeApi';
import { useStarterNodesApi } from '../hooks/useStarterNodesApi';
import { useWorldsApi } from '../hooks/useWorldsApi';
import { keyOf } from '../utils/keyOf';
import { generateMap } from '../utils/generateMap';
import { downloadJson, pickJsonFile } from '../utils/exportJson';
import { biomeLabel } from '../constants/biomeGroups';
import { FeedDock } from '../components/feed/FeedDock';
import { usePersistedToggle } from '../components/feed/usePersistedToggle';
import { AgentInspector } from '../components/agent/AgentInspector';
import { AuditDrawer } from '../components/history/AuditDrawer';
import { ZonePanel } from '../components/zone/ZonePanel';
import toolbarStyles from '../components/Toolbar.module.css';
import styles from './EditorScreen.module.css';

interface StarterMenuState {
  q: number;
  r: number;
  tile: Node | null;
  screenX: number;
  screenY: number;
}

const HEX_SIZE = 20;

interface Props {
  worldId: number;
  sphereIndex: number;
  onBack: () => void;
}

function nodesToMap(list: Node[]): Map<string, Node> {
  const m = new Map<string, Node>();
  for (const n of list) m.set(keyOf(n.q, n.r), n);
  return m;
}

export function EditorScreen({ worldId, sphereIndex, onBack }: Props) {
  const [radius, setRadius] = useState(12);
  const hexApi = useHexGrid({ radius, size: HEX_SIZE });

  const [nodes, setNodes] = useState<Map<string, Node>>(() => new Map());
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('FOREST');
  const [hover, setHover] = useState<{ q: number; r: number; terrain: TerrainType | null } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<EditorView>('3d');
  const [toast, setToast] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [globeNode, setGlobeNode] = useState<GlobeNode | null>(null);
  const [feedOpen, setFeedOpen] = usePersistedToggle('feedDock.open', false);
  const [inspectedAgent, setInspectedAgent] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);

  const dirtyTracker = useDirtyTracker();
  const api = useMapApi({ worldId, sphereIndex, initialRadius: radius });
  const globeApi = useGlobeApi();
  const worldsApi = useWorldsApi();
  const starterApi = useStarterNodesApi();

  const [starters, setStarters] = useState<StarterNode[]>([]);
  const [menu, setMenu] = useState<StarterMenuState | null>(null);

  const showToast = useCallback((kind: 'error' | 'info', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => {
      setToast((cur) => (cur && cur.text === text ? null : cur));
    }, 4000);
  }, []);

  useEffect(() => {
    if (api.error) {
      showToast('error', api.error);
      api.clearError();
    }
  }, [api, showToast]);

  useEffect(() => {
    let cancelled = false;
    // Fetch the world first so we can size the hex grid by the user's chosen
    // node_size (per-node hex radius), then load hexes with that radius. Done
    // sequentially via async/await so an effect cleanup (StrictMode remount,
    // worldId change) cancels mid-flight before sending the load request.
    (async () => {
      try {
        const world = await worldsApi.get(worldId);
        if (cancelled) return;
        const seed = Math.max(1, Math.min(80, Math.floor(world.node_size)));
        setRadius(seed);
        const list = await api.load(seed);
        if (cancelled) return;
        setNodes(nodesToMap(list));
        const maxAbs = list.reduce(
          (m, n) => Math.max(m, Math.abs(n.q), Math.abs(n.r), Math.abs(n.q + n.r)),
          0,
        );
        if (maxAbs > 0) setRadius(maxAbs);
        dirtyTracker.clear();
      } catch {
        /* handled via toast */
      }
    })();
    globeApi
      .get(worldId, sphereIndex)
      .then((n) => {
        if (!cancelled) setGlobeNode(n);
      })
      .catch(() => {
        /* handled via toast */
      });
    starterApi
      .list(worldId)
      .then((list) => {
        if (!cancelled) setStarters(list);
      })
      .catch(() => {
        /* handled via toast */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId, sphereIndex]);

  const handlePaint = useCallback(
    (q: number, r: number) => {
      setNodes((prev) => {
        const key = keyOf(q, r);
        const existing = prev.get(key);
        if (existing && existing.terrain === selectedTerrain) return prev;
        const next = new Map(prev);
        const node: Node = { ...(existing ?? {}), q, r, terrain: selectedTerrain };
        next.set(key, node);
        dirtyTracker.markDirty(node);
        return next;
      });
    },
    [selectedTerrain, dirtyTracker],
  );

  const handlePaintMany = useCallback(
    (coords: Array<{ q: number; r: number }>) => {
      setNodes((prev) => {
        const next = new Map(prev);
        const changed: Node[] = [];
        for (const { q, r } of coords) {
          const key = keyOf(q, r);
          const existing = next.get(key);
          if (existing && existing.terrain === selectedTerrain) continue;
          const node: Node = { ...(existing ?? {}), q, r, terrain: selectedTerrain };
          next.set(key, node);
          changed.push(node);
        }
        if (changed.length) dirtyTracker.markManyDirty(changed);
        return next;
      });
    },
    [selectedTerrain, dirtyTracker],
  );

  const handleLoad = useCallback(async () => {
    try {
      const list = await api.load();
      setNodes(nodesToMap(list));
      dirtyTracker.clear();
      showToast('info', `Loaded ${list.length} nodes`);
    } catch {
      /* toast via effect */
    }
  }, [api, dirtyTracker, showToast]);

  const promptRadius = useCallback((fallback: number): number | null => {
    const s = window.prompt('Grid radius?', String(fallback));
    if (s == null) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 1 || n > 80) {
      window.alert('Radius must be an integer between 1 and 80');
      return null;
    }
    return Math.floor(n);
  }, []);

  const handleNew = useCallback(() => {
    const r = promptRadius(radius);
    if (r == null) return;
    setRadius(r);
    const newNodes = new Map<string, Node>();
    const changed: Node[] = [];
    for (let q = -r; q <= r; q++) {
      const rMin = Math.max(-r, -q - r);
      const rMax = Math.min(r, -q + r);
      for (let rr = rMin; rr <= rMax; rr++) {
        const node: Node = { q, r: rr, terrain: 'PLAINS' };
        newNodes.set(keyOf(q, rr), node);
        changed.push(node);
      }
    }
    setNodes(newNodes);
    dirtyTracker.clear();
    dirtyTracker.markManyDirty(changed);
    showToast('info', `New map: ${changed.length} hexes filled with PLAINS`);
  }, [promptRadius, radius, dirtyTracker, showToast]);

  const handleGenerate = useCallback(() => {
    const r = promptRadius(radius);
    if (r == null) return;
    const seedStr = window.prompt('Seed (leave empty for random):', '');
    const seed = seedStr && seedStr.trim() ? seedStr.trim() : undefined;
    setRadius(r);

    const coords: Array<{ q: number; r: number }> = [];
    for (let q = -r; q <= r; q++) {
      const rMin = Math.max(-r, -q - r);
      const rMax = Math.min(r, -q + r);
      for (let rr = rMin; rr <= rMax; rr++) coords.push({ q, r: rr });
    }
    const generated = generateMap(coords, { radius: r, seed });
    const m = new Map<string, Node>();
    for (const n of generated) m.set(keyOf(n.q, n.r), n);
    setNodes(m);
    dirtyTracker.clear();
    dirtyTracker.markManyDirty(generated);
    showToast('info', `Generated ${generated.length} hexes${seed ? ` (seed: ${seed})` : ''}`);
  }, [promptRadius, radius, dirtyTracker, showToast]);

  const handleExport = useCallback(() => {
    const list = Array.from(nodes.values());
    const fname = `world${worldId}-node${sphereIndex}.json`;
    downloadJson(list, fname);
    showToast('info', `Exported ${list.length} nodes`);
  }, [nodes, worldId, sphereIndex, showToast]);

  const handleImport = useCallback(async () => {
    try {
      const list = await pickJsonFile();
      setNodes(nodesToMap(list));
      dirtyTracker.clear();
      dirtyTracker.markManyDirty(list);
      const maxAbs = list.reduce(
        (m, n) => Math.max(m, Math.abs(n.q), Math.abs(n.r), Math.abs(n.q + n.r)),
        0,
      );
      if (maxAbs > radius) setRadius(maxAbs);
      showToast('info', `Imported ${list.length} nodes`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      showToast('error', msg);
    }
  }, [dirtyTracker, radius, showToast]);

  const handleSave = useCallback(async () => {
    const toSave = Array.from(dirtyTracker.dirty.values());
    if (!toSave.length) return;
    try {
      const res = await api.save(toSave);
      dirtyTracker.clear();
      showToast('info', `Saved ${res.updated} change${res.updated === 1 ? '' : 's'}`);
    } catch {
      /* toast via effect — dirty state preserved */
    }
  }, [api, dirtyTracker, showToast]);

  const handleBack = useCallback(() => {
    if (dirtyTracker.size > 0) {
      const ok = window.confirm(
        `You have ${dirtyTracker.size} unsaved change${dirtyTracker.size === 1 ? '' : 's'}. Save before leaving?`,
      );
      if (ok) {
        handleSave().finally(onBack);
        return;
      }
    }
    onBack();
  }, [dirtyTracker.size, handleSave, onBack]);

  const nodeCount = nodes.size;
  const dirtyCount = dirtyTracker.size;

  const hoverWithTerrain = useMemo(() => {
    if (!hover) return null;
    const existing = nodes.get(keyOf(hover.q, hover.r));
    return { q: hover.q, r: hover.r, terrain: existing?.terrain ?? null };
  }, [hover, nodes]);

  // Fast lookup of tiles in the currently loaded region by db id.
  const tilesById = useMemo(() => {
    const m = new Map<number, Node>();
    for (const n of nodes.values()) {
      if (n.id != null) m.set(n.id, n);
    }
    return m;
  }, [nodes]);

  const handleTileContextMenu = useCallback(
    (q: number, r: number, sx: number, sy: number) => {
      const tile = nodes.get(keyOf(q, r)) ?? null;
      setMenu({ q, r, tile, screenX: sx, screenY: sy });
    },
    [nodes],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const refreshStarters = useCallback(async () => {
    try {
      const list = await starterApi.list(worldId);
      setStarters(list);
    } catch {
      /* error toast via effect */
    }
  }, [starterApi, worldId]);

  const assignStarter = useCallback(
    async (raceId: RaceId) => {
      if (!menu) return;
      const tile = menu.tile;
      if (!tile || tile.id == null) {
        showToast('error', 'Save terrain changes first — this tile has no id yet');
        closeMenu();
        return;
      }
      try {
        await starterApi.set(worldId, raceId, tile.id);
        await refreshStarters();
        showToast('info', `${raceId} → tile id ${tile.id}`);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Assign failed');
      } finally {
        closeMenu();
      }
    },
    [menu, starterApi, worldId, refreshStarters, showToast, closeMenu],
  );

  const clearStarter = useCallback(
    async (raceId: RaceId) => {
      try {
        await starterApi.remove(worldId, raceId);
        await refreshStarters();
        showToast('info', `${raceId} cleared`);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Clear failed');
      } finally {
        closeMenu();
      }
    },
    [starterApi, worldId, refreshStarters, showToast, closeMenu],
  );

  const breadcrumb = globeNode
    ? globeNode.biome
      ? `Node #${sphereIndex} · ${biomeLabel(globeNode.biome)}`
      : `Node #${sphereIndex}`
    : `Node #${sphereIndex}`;

  return (
    <div className={styles.root}>
      <Toolbar
        dirtyCount={dirtyCount}
        loading={api.loading}
        onLoad={handleLoad}
        onNew={handleNew}
        onGenerate={handleGenerate}
        onExport={handleExport}
        onImport={handleImport}
        onSave={handleSave}
        onBack={handleBack}
        breadcrumb={breadcrumb}
        view={view}
        onViewChange={setView}
        rightExtras={
          <>
            <button
              type="button"
              className={`${toolbarStyles.btn} ${zonesOpen ? toolbarStyles.active : ''}`}
              onClick={() => setZonesOpen(true)}
              title="NPC spawn zones for this node"
              aria-pressed={zonesOpen}
              disabled={globeNode?.id == null}
            >
              Zones
            </button>
            <button
              type="button"
              className={`${toolbarStyles.btn} ${feedOpen ? toolbarStyles.active : ''}`}
              onClick={() => setFeedOpen(!feedOpen)}
              title="Toggle live feed"
              aria-pressed={feedOpen}
            >
              Feed
            </button>
            <button
              type="button"
              className={toolbarStyles.btn}
              onClick={() => setAuditOpen(true)}
              title="Audit log"
            >
              History
            </button>
          </>
        }
      />
      <div className={styles.body}>
        <TerrainSidebar selected={selectedTerrain} onSelect={setSelectedTerrain} />
        {view === '3d' ? (
          <MapCanvas3D
            hexApi={hexApi}
            nodes={nodes}
            selectedTerrain={selectedTerrain}
            starters={starters}
            tilesById={tilesById}
            onPaint={handlePaint}
            onHoverChange={setHover}
            onZoomChange={setZoom}
            onTileContextMenu={handleTileContextMenu}
            loading={api.loading}
          />
        ) : (
          <MapCanvas
            hexApi={hexApi}
            nodes={nodes}
            dirty={dirtyTracker.dirty}
            selectedTerrain={selectedTerrain}
            starters={starters}
            tilesById={tilesById}
            onPaint={handlePaint}
            onPaintMany={handlePaintMany}
            onHoverChange={setHover}
            onZoomChange={setZoom}
            onTileContextMenu={handleTileContextMenu}
            loading={api.loading}
          />
        )}
      </div>
      {menu && (
        <StarterContextMenu
          tile={menu.tile}
          starters={starters}
          tilesById={tilesById}
          screenX={menu.screenX}
          screenY={menu.screenY}
          onAssign={assignStarter}
          onClear={clearStarter}
          onClose={closeMenu}
        />
      )}
      <StatusBar
        hover={hoverWithTerrain}
        zoom={zoom}
        nodeCount={nodeCount}
        dirtyCount={dirtyCount}
      />
      {toast && (
        <div
          className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : styles.toastInfo}`}
          onClick={() => setToast(null)}
        >
          {toast.text}
        </div>
      )}
      <FeedDock
        open={feedOpen}
        onOpenChange={setFeedOpen}
        nodeScope={globeNode?.id ?? undefined}
        topOffset={54}
        onAgentSelect={setInspectedAgent}
      />
      {inspectedAgent && (
        <AgentInspector
          agentId={inspectedAgent}
          onClose={() => setInspectedAgent(null)}
        />
      )}
      {auditOpen && <AuditDrawer onClose={() => setAuditOpen(false)} />}
      {zonesOpen && (
        <ZonePanel
          worldId={worldId}
          nodeId={globeNode?.id ?? undefined}
          onClose={() => setZonesOpen(false)}
        />
      )}
    </div>
  );
}
