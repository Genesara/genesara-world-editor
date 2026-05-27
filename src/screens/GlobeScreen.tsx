import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { Biome, ClimateType, GlobeNode, World } from '../types';
import { isCreatedNode } from '../types';
import { useGlobeApi } from '../hooks/useGlobeApi';
import { useWorldsApi } from '../hooks/useWorldsApi';
import { GlobeMesh } from '../components/globe/GlobeMesh';
import { CreateNodeDialog } from '../components/globe/CreateNodeDialog';
import { ClimateLegend } from '../components/globe/ClimateLegend';
import {
  GlobeContextMenu,
  type ContextMenuItem,
} from '../components/globe/GlobeContextMenu';
import { biomeColorFor } from '../constants/biomeColors';
import { biomeLabel } from '../constants/biomeGroups';
import { climateColorFor } from '../constants/climateColors';
import { climateLabel } from '../constants/climateGroups';
import { FeedDock } from '../components/feed/FeedDock';
import { usePersistedToggle } from '../components/feed/usePersistedToggle';
import { AgentLayer } from '../components/globe/AgentLayer';
import { LayersMenu, type LayerOption } from '../components/globe/LayersMenu';
import { ZoneLayer } from '../components/globe/ZoneLayer';
import { AgentInspector } from '../components/agent/AgentInspector';
import { AuditDrawer } from '../components/history/AuditDrawer';
import { useAgentPositions } from '../hooks/useAgentPositions';
import { useZonesApi } from '../hooks/useZonesApi';
import styles from './GlobeScreen.module.css';

interface Props {
  worldId: number;
  onBack: () => void;
  onEnterNode: (sphereIndex: number) => void;
}

interface ModalState {
  mode: 'create' | 'edit';
  sphereIndex: number;
  initial?: { biome: Biome | null; climate: ClimateType | null };
}

interface ContextMenuState {
  sphereIndex: number;
  x: number;
  y: number;
}

export function GlobeScreen({ worldId, onBack, onEnterNode }: Props) {
  const worldsApi = useWorldsApi();
  const globeApi = useGlobeApi();

  const [world, setWorld] = useState<World | null>(null);
  const [nodes, setNodes] = useState<Map<number, GlobeNode>>(() => new Map());
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [feedOpen, setFeedOpen] = usePersistedToggle('feedDock.open', false);
  const [agentLayerOn, setAgentLayerOn] = usePersistedToggle('globe.layer.agents', true);
  const [zoneLayerOn, setZoneLayerOn] = usePersistedToggle('globe.layer.zones', true);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [inspectedAgent, setInspectedAgent] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [highlightClimate, setHighlightClimate] = useState<ClimateType | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([worldsApi.list(), globeApi.list(worldId)])
      .then(([worlds, globeNodes]) => {
        if (cancelled) return;
        setWorld(worlds.find((w) => w.id === worldId) ?? null);
        const map = new Map<number, GlobeNode>();
        for (const n of globeNodes) map.set(n.sphere_index, n);
        setNodes(map);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load world');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  const upsertNode = useCallback((node: GlobeNode) => {
    setNodes((prev) => {
      const next = new Map(prev);
      next.set(node.sphere_index, node);
      return next;
    });
  }, []);

  // Map persisted GlobeNode.id (what live-feed events carry) to sphere face.
  const idToSphereIndex = useMemo(() => {
    const m = new Map<number, number>();
    for (const n of nodes.values()) {
      if (n.id != null) m.set(n.id, n.sphere_index);
    }
    return m;
  }, [nodes]);

  const sphereIndexLookup = useCallback(
    (nodeId: number) => idToSphereIndex.get(nodeId) ?? null,
    [idToSphereIndex],
  );

  const agentPositions = useAgentPositions(sphereIndexLookup);
  const agentTotal = useMemo(() => {
    let n = 0;
    for (const a of agentPositions.values()) n += a.length;
    return n;
  }, [agentPositions]);

  const zonesApi = useZonesApi(worldId);
  const zoneSphereIndices = useMemo(() => {
    const s = new Set<number>();
    for (const nodeId of zonesApi.nodeIdsWithZone) {
      const face = idToSphereIndex.get(nodeId);
      if (face != null) s.add(face);
    }
    return s;
  }, [zonesApi.nodeIdsWithZone, idToSphereIndex]);

  const activeIdx = hovered ?? selected;
  const activeNode = useMemo(
    () => (activeIdx == null ? null : nodes.get(activeIdx) ?? null),
    [activeIdx, nodes],
  );

  const handleSelect = useCallback(
    (sphereIndex: number) => {
      const node = nodes.get(sphereIndex);
      if (!node) return;
      if (isCreatedNode(node)) {
        setSelected(sphereIndex);
        onEnterNode(sphereIndex);
      } else {
        setSelected(sphereIndex);
        setModal({
          mode: 'create',
          sphereIndex,
          initial: { biome: null, climate: null },
        });
      }
    },
    [nodes, onEnterNode],
  );

  const handleContextMenu = useCallback(
    (payload: { sphereIndex: number; clientX: number; clientY: number }) => {
      setContextMenu({
        sphereIndex: payload.sphereIndex,
        x: payload.clientX,
        y: payload.clientY,
      });
    },
    [],
  );

  const handleConfirmModal = useCallback(
    async (input: { biome: Biome; climate: ClimateType }) => {
      if (!modal) return;
      const sphereIndex = modal.sphereIndex;
      const existing = nodes.get(sphereIndex);
      if (!existing) return;
      setBusy(true);
      try {
        let updated: GlobeNode;
        if (modal.mode === 'create' || !isCreatedNode(existing)) {
          updated = await globeApi.create(worldId, {
            sphere_index: sphereIndex,
            biome: input.biome,
            climate: input.climate,
            face_vertices: existing.face_vertices,
            centroid: existing.centroid,
            neighbor_indices: existing.neighbor_indices,
          });
        } else {
          updated = await globeApi.update(worldId, sphereIndex, input);
        }
        upsertNode(updated);
        setModal(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save node');
      } finally {
        setBusy(false);
      }
    },
    [globeApi, modal, nodes, upsertNode, worldId],
  );

  const handleClearNode = useCallback(
    async (sphereIndex: number) => {
      setBusy(true);
      try {
        const updated = await globeApi.clear(worldId, sphereIndex);
        upsertNode(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clear node');
      } finally {
        setBusy(false);
      }
    },
    [globeApi, upsertNode, worldId],
  );

  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const node = nodes.get(contextMenu.sphereIndex);
    if (!node) return [];
    if (isCreatedNode(node)) {
      return [
        {
          label: 'Open Node Editor',
          onClick: () => onEnterNode(contextMenu.sphereIndex),
        },
        {
          label: 'Edit Climate / Biome',
          onClick: () =>
            setModal({
              mode: 'edit',
              sphereIndex: contextMenu.sphereIndex,
              initial: { biome: node.biome, climate: node.climate },
            }),
        },
        {
          label: 'Clear Node',
          destructive: true,
          onClick: () => {
            if (window.confirm(`Clear node #${contextMenu.sphereIndex}?`)) {
              void handleClearNode(contextMenu.sphereIndex);
            }
          },
        },
      ];
    }
    return [
      {
        label: 'Create Node',
        onClick: () =>
          setModal({
            mode: 'create',
            sphereIndex: contextMenu.sphereIndex,
            initial: { biome: null, climate: null },
          }),
      },
    ];
  }, [contextMenu, handleClearNode, nodes, onEnterNode]);

  const created = activeNode && isCreatedNode(activeNode) ? activeNode : null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Worlds
        </button>
        <div className={styles.breadcrumb}>
          <span className={styles.breadWorld}>{world?.name ?? '…'}</span>
          {world && (
            <span className={styles.breadMeta}>
              {world.node_count} nodes · size {world.node_size}
            </span>
          )}
        </div>
        <div className={styles.headerSpacer} />
        <button
          type="button"
          className={`${styles.toggle} ${legendOpen ? styles.toggleActive : ''}`}
          onClick={() => setLegendOpen((v) => !v)}
          title="Toggle climate legend"
        >
          ⌘ Climate Legend
        </button>
        <button
          type="button"
          className={`${styles.toggle} ${autoRotate ? styles.toggleActive : ''}`}
          onClick={() => setAutoRotate((v) => !v)}
          title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
        >
          {autoRotate ? '⏸ Rotation' : '▶ Rotation'}
        </button>
        <button
          type="button"
          className={`${styles.toggle} ${layersMenuOpen ? styles.toggleActive : ''}`}
          onClick={() => setLayersMenuOpen((v) => !v)}
          title="Layers"
        >
          ☷ Layers
        </button>
        <button
          type="button"
          className={`${styles.toggle} ${feedOpen ? styles.toggleActive : ''}`}
          onClick={() => setFeedOpen(!feedOpen)}
          title="Toggle live feed"
        >
          ▤ Feed
        </button>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setAuditOpen(true)}
          title="Audit log"
        >
          ⟳ History
        </button>
      </header>

      <div
        className={styles.canvasWrap}
        onPointerDown={() => setAutoRotate(false)}
        onWheel={() => setAutoRotate(false)}
      >
        {error && <div className={styles.error}>{error}</div>}
        {nodes.size > 0 && (
          <Canvas
            camera={{ position: [0, 0, 3], fov: 45 }}
            gl={{ antialias: true }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#05070b']} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[3, 2, 5]} intensity={1.0} />
            <directionalLight position={[-4, -2, -3]} intensity={0.3} />
            <Stars radius={50} depth={30} count={1500} factor={3} fade />
            <GlobeMesh
              nodes={nodes}
              hoveredIndex={hovered}
              selectedIndex={selected}
              highlightClimate={highlightClimate}
              onHover={setHovered}
              onSelect={handleSelect}
              onContextMenu={handleContextMenu}
            />
            {agentLayerOn && (
              <AgentLayer
                nodes={nodes}
                positions={agentPositions}
                onAgentClick={setInspectedAgent}
              />
            )}
            {zoneLayerOn && (
              <ZoneLayer
                nodes={nodes}
                existing={zoneSphereIndices}
                draftCreate={EMPTY_SET}
                draftDelete={EMPTY_SET}
              />
            )}
            <OrbitControls
              enableZoom
              enablePan={false}
              minDistance={1.4}
              maxDistance={6}
              rotateSpeed={0.6}
              autoRotate={autoRotate}
              autoRotateSpeed={0.6}
            />
          </Canvas>
        )}
        {nodes.size === 0 && !error && <div className={styles.loading}>Loading world…</div>}
      </div>

      {legendOpen && (
        <ClimateLegend
          nodes={nodes}
          highlight={highlightClimate}
          onHighlight={setHighlightClimate}
          onClose={() => setLegendOpen(false)}
        />
      )}

      {activeNode && (
        <div className={styles.panel}>
          {created ? (
            <>
              <div className={styles.panelHeader}>
                <span
                  className={styles.swatch}
                  style={{ background: biomeColorFor(created.biome) }}
                />
                <div className={styles.panelTitle}>Node #{created.sphere_index}</div>
                <div className={styles.panelTerrain}>
                  {biomeLabel(created.biome)}
                </div>
              </div>
              <div className={styles.climateRow}>
                <span
                  className={styles.swatch}
                  style={{ background: climateColorFor(created.climate) }}
                />
                <span className={styles.panelClimate}>
                  {climateLabel(created.climate)}
                </span>
              </div>
              <div className={styles.panelMeta}>
                {created.face_vertices.length === 5 ? 'Pentagon' : 'Hexagon'} ·{' '}
                {created.neighbor_indices.length} neighbors
              </div>
              <div className={styles.hint}>
                Click to open editor · right-click for options
              </div>
            </>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <span className={`${styles.swatch} ${styles.emptySwatch}`} />
                <div className={styles.panelTitle}>
                  Empty face #{activeNode.sphere_index}
                </div>
              </div>
              <div className={styles.panelMeta}>
                {activeNode.face_vertices.length === 5 ? 'Pentagon' : 'Hexagon'} ·{' '}
                {activeNode.neighbor_indices.length} neighbors
              </div>
              <button
                type="button"
                className={styles.enterBtn}
                onClick={() =>
                  setModal({
                    mode: 'create',
                    sphereIndex: activeNode.sphere_index,
                    initial: { biome: null, climate: null },
                  })
                }
              >
                Create node…
              </button>
              <div className={styles.hint}>Click face to create node</div>
            </>
          )}
        </div>
      )}

      {modal && (
        <CreateNodeDialog
          sphereIndex={modal.sphereIndex}
          mode={modal.mode}
          initial={modal.initial}
          onCancel={() => setModal(null)}
          onConfirm={handleConfirmModal}
          busy={busy}
        />
      )}

      {contextMenu && (
        <GlobeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {layersMenuOpen && (
        <LayersMenu
          onClose={() => setLayersMenuOpen(false)}
          options={layerOptions(
            agentLayerOn,
            setAgentLayerOn,
            agentTotal,
            zoneLayerOn,
            setZoneLayerOn,
            zoneSphereIndices.size,
          )}
        />
      )}

      <FeedDock
        open={feedOpen}
        onOpenChange={setFeedOpen}
        topOffset={58}
        onAgentSelect={setInspectedAgent}
      />

      {inspectedAgent && (
        <AgentInspector
          agentId={inspectedAgent}
          onClose={() => setInspectedAgent(null)}
        />
      )}

      {auditOpen && <AuditDrawer onClose={() => setAuditOpen(false)} />}
    </div>
  );
}

const EMPTY_SET: Set<number> = new Set();

function layerOptions(
  agentLayerOn: boolean,
  setAgentLayerOn: (v: boolean) => void,
  agentCount: number,
  zoneLayerOn: boolean,
  setZoneLayerOn: (v: boolean) => void,
  zoneCount: number,
): LayerOption[] {
  return [
    {
      id: 'agents',
      label: 'Agents',
      active: agentLayerOn,
      count: agentCount,
      onToggle: () => setAgentLayerOn(!agentLayerOn),
    },
    {
      id: 'zones',
      label: 'NPC zones',
      active: zoneLayerOn,
      count: zoneCount,
      onToggle: () => setZoneLayerOn(!zoneLayerOn),
    },
  ];
}
