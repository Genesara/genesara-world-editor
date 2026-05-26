import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateGoldberg, faceCountForFrequency } from '@/lib/globe/goldberg';
import { useRecent } from '@/lib/recent';
import { Card, CardSection } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { GlobeScene } from './GlobeScene';
import { useGlobeOverlays } from './useGlobeOverlays';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_T = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Overlay toggle pill
// ─────────────────────────────────────────────────────────────────────────────

interface OverlayToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

function OverlayToggle({ label, active, onToggle }: OverlayToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2 rounded border text-xs font-medium transition-colors duration-150 select-none',
        active
          ? 'bg-accent-subtle text-accent border-accent/40'
          : 'bg-bg-raised text-fg-muted border-border-default hover:text-fg-default hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          active ? 'bg-accent' : 'bg-fg-muted',
        )}
      />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat row
// ─────────────────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="text-xs font-mono tabular-nums text-fg-default">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────

export function WorldMapView() {
  const navigate = useNavigate();
  const { pushNode } = useRecent();

  // ── World ID ────────────────────────────────────────────────────────────
  const [worldIdInput, setWorldIdInput] = useState('1');
  const worldId = useMemo(() => {
    const n = parseInt(worldIdInput, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [worldIdInput]);

  // ── Goldberg mesh — generated once at T=10, memoised ───────────────────
  const globeMesh = useMemo(() => generateGoldberg(DEFAULT_T), []);
  const faceCount = faceCountForFrequency(DEFAULT_T);

  // ── Overlay data from feed + API ────────────────────────────────────────
  const overlayData = useGlobeOverlays(worldId);

  // ── Overlay toggles ─────────────────────────────────────────────────────
  const [showZones, setShowZones] = useState(true);
  const [showDensity, setShowDensity] = useState(true);
  const [showPresence, setShowPresence] = useState(true);

  // ── Selected / hovered face ─────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectedFace = useMemo(
    () => (selectedIndex !== null ? globeMesh.faces[selectedIndex] : null),
    [globeMesh.faces, selectedIndex],
  );

  // ── Click handler — navigate to node detail ─────────────────────────────
  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      pushNode(index);
      navigate(`/nodes/${index}`);
    },
    [navigate, pushNode],
  );

  // ── Zone tooltip helper (region-scoped zones cannot be shown per-face) ──
  const nodeZone = useMemo(() => {
    if (selectedIndex === null) return null;
    return overlayData.zones.find(
      (z) => z.scope === 'NODE' && z.nodeId === selectedIndex,
    ) ?? null;
  }, [selectedIndex, overlayData.zones]);

  const regionZoneCount = useMemo(
    () => overlayData.zones.filter((z) => z.scope === 'REGION').length,
    [overlayData.zones],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─────────────────── Left rail ────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col gap-2 p-2 border-r border-border-subtle bg-bg-subtle overflow-y-auto">

        {/* World ID */}
        <Card>
          <CardSection title="World">
            <div className="flex items-center gap-2">
              <label className="text-xs text-fg-muted shrink-0">World ID</label>
              <Input
                type="number"
                value={worldIdInput}
                onChange={(e) => setWorldIdInput(e.target.value)}
                className="h-7 text-xs"
                min={1}
                mono
              />
            </div>
          </CardSection>
        </Card>

        {/* Overlays */}
        <Card>
          <CardSection title="Overlays">
            <div className="flex flex-col gap-1.5">
              <OverlayToggle
                label="NPC zones"
                active={showZones}
                onToggle={() => setShowZones((v) => !v)}
              />
              <OverlayToggle
                label="Building density"
                active={showDensity}
                onToggle={() => setShowDensity((v) => !v)}
              />
              <OverlayToggle
                label="Agent presence"
                active={showPresence}
                onToggle={() => setShowPresence((v) => !v)}
              />
              {regionZoneCount > 0 && (
                <p className="text-2xs text-fg-muted mt-1 leading-snug">
                  {regionZoneCount} region-scoped zone{regionZoneCount > 1 ? 's' : ''} — region overlay coming soon
                </p>
              )}
            </div>
          </CardSection>
        </Card>

        {/* Selected face inspector */}
        <Card>
          <CardSection title="Selected face">
            {selectedFace === null ? (
              <p className="text-xs text-fg-muted">Click a face to inspect</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Pill tone="accent">#{selectedFace.index}</Pill>
                  {selectedFace.isPentagon && <Pill tone="warning">pentagon</Pill>}
                </div>

                {nodeZone && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-2xs text-fg-muted uppercase tracking-wider">NPC zone</span>
                    <span className="text-xs text-fg-default font-mono">{nodeZone.zoneId.slice(0, 12)}…</span>
                    <span className="text-2xs text-fg-muted">max {nodeZone.maxConcurrent} concurrent</span>
                  </div>
                )}

                {/* Neighbour chip row */}
                <div>
                  <span className="text-2xs text-fg-muted uppercase tracking-wider block mb-1">Neighbours</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedFace.neighbors.map((n, i) =>
                      n >= 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(n);
                            pushNode(n);
                            navigate(`/nodes/${n}`);
                          }}
                          className={cn(
                            'inline-flex items-center h-5 px-1.5 rounded-sm border text-2xs font-mono',
                            'bg-bg-raised text-fg-muted border-border-default',
                            'hover:text-fg-default hover:border-border-strong transition-colors duration-150',
                          )}
                        >
                          {n}
                        </button>
                      ) : null,
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start text-xs"
                  onClick={() => {
                    pushNode(selectedFace.index);
                    navigate(`/nodes/${selectedFace.index}`);
                  }}
                >
                  Open node detail →
                </Button>
              </div>
            )}
          </CardSection>
        </Card>

        {/* Stats */}
        <Card>
          <CardSection title="Stats">
            <div className="flex flex-col gap-1.5">
              <StatRow label="Frequency T" value={DEFAULT_T} />
              <StatRow label="Face count" value={faceCount.toLocaleString()} />
              <StatRow label="Agents tracked" value={overlayData.totalAgents} />
              <StatRow
                label="Zones loaded"
                value={overlayData.zonesLoading ? '…' : overlayData.zones.length}
              />
              {hoveredIndex !== null && (
                <div className="pt-1 border-t border-border-subtle">
                  <StatRow label="Hovered face" value={hoveredIndex} />
                  <StatRow
                    label="Agents here"
                    value={overlayData.agentPresence.get(hoveredIndex) ?? 0}
                  />
                </div>
              )}
            </div>
          </CardSection>
        </Card>
      </aside>

      {/* ─────────────────── Globe canvas ─────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <GlobeScene
          mesh={globeMesh}
          selectedIndex={selectedIndex}
          hoveredIndex={hoveredIndex}
          onHover={setHoveredIndex}
          onSelect={handleSelect}
          overlayData={overlayData}
          showZones={showZones}
          showDensity={showDensity}
          showPresence={showPresence}
        />
      </div>
    </div>
  );
}
