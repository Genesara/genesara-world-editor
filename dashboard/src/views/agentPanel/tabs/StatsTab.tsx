import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { MapPin, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import type { AgentDetail, TeleportResponse } from '@/lib/api/agents';
import type { Uuid } from '@/lib/types';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/InlineError';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useSetXp,
  useSetLevel,
  useSetAttributes,
  useSetGauges,
  useSetClass,
  useReopenClassOffers,
  useTeleport,
  useSetSafeNode,
  useRespawn,
} from '../hooks/useAgentQuery';

interface Props {
  agent: AgentDetail;
  agentId: Uuid;
}

// ── Gauge configuration ──────────────────────────────────────────────────────

type GaugeKey = keyof AgentDetail['gauges'];

interface GaugeDef {
  key: GaugeKey;
  label: string;
  maxKey?: GaugeKey;
}

const GAUGE_DEFS: GaugeDef[] = [
  { key: 'hp', label: 'HP', maxKey: 'hpMax' },
  { key: 'stamina', label: 'Stamina', maxKey: 'staminaMax' },
  { key: 'mana', label: 'Mana', maxKey: 'manaMax' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'thirst', label: 'Thirst' },
  { key: 'sleep', label: 'Sleep' },
];

type AttrKey = keyof Omit<AgentDetail['attributes'], 'unspent'>;

const ATTR_DEFS: { key: AttrKey; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'per', label: 'PER' },
  { key: 'int', label: 'INT' },
  { key: 'luck', label: 'LUCK' },
];

// ── Attribute row with debounce ───────────────────────────────────────────────

function AttrRow({
  attrKey,
  label,
  value,
  onCommit,
}: {
  attrKey: AttrKey;
  label: string;
  value: number;
  onCommit: (k: AttrKey, v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocal(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    const num = Number(raw);
    if (!raw || isNaN(num)) return;
    timerRef.current = setTimeout(() => {
      onCommit(attrKey, num);
    }, 400);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-2xs uppercase tracking-wider text-fg-muted font-medium">{label}</span>
      <Input
        mono
        type="number"
        value={local}
        onChange={handleChange}
        className="w-20 h-7 text-xs"
      />
    </div>
  );
}

// ── Gauge row ────────────────────────────────────────────────────────────────

function GaugeRow({
  def,
  gauges,
  onCommit,
}: {
  def: GaugeDef;
  gauges: AgentDetail['gauges'];
  onCommit: (patch: Partial<AgentDetail['gauges']>) => void;
}) {
  const current = gauges[def.key];
  const max = def.maxKey ? gauges[def.maxKey] : 100;
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;

  const [localCurrent, setLocalCurrent] = useState(String(current));
  const [localMax, setLocalMax] = useState(def.maxKey ? String(max) : '');

  useEffect(() => {
    setLocalCurrent(String(gauges[def.key]));
    if (def.maxKey) setLocalMax(String(gauges[def.maxKey]));
  }, [gauges, def.key, def.maxKey]);

  const commitCurrent = () => {
    const num = Number(localCurrent);
    if (isNaN(num)) return;
    onCommit({ [def.key]: num });
  };

  const commitMax = () => {
    if (!def.maxKey) return;
    const num = Number(localMax);
    if (isNaN(num)) return;
    onCommit({ [def.maxKey]: num });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-fg-muted">{def.label}</span>
      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-bg-overlay overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Value input */}
      <Input
        mono
        type="number"
        value={localCurrent}
        onChange={(e) => setLocalCurrent(e.target.value)}
        onBlur={commitCurrent}
        onKeyDown={(e) => e.key === 'Enter' && commitCurrent()}
        className="w-16 h-7 text-xs"
      />
      {def.maxKey && (
        <>
          <span className="text-xs text-fg-muted">/</span>
          <Input
            mono
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={commitMax}
            onKeyDown={(e) => e.key === 'Enter' && commitMax()}
            className="w-16 h-7 text-xs"
          />
        </>
      )}
    </div>
  );
}

// ── Main StatsTab ─────────────────────────────────────────────────────────────

export function StatsTab({ agent, agentId }: Props) {
  // Identity state
  const [levelInput, setLevelInput] = useState(String(agent.level));
  const [xpInput, setXpInput] = useState('');
  const [classInput, setClassInput] = useState(agent.classId ?? '');

  // Dialogs
  const [teleportOpen, setTeleportOpen] = useState(false);
  const [safeNodeOpen, setSafeNodeOpen] = useState(false);
  const [respawnOpen, setRespawnOpen] = useState(false);

  const [teleportNodeInput, setTeleportNodeInput] = useState('');
  const [safeNodeInput, setSafeNodeInput] = useState('');
  const [teleportResult, setTeleportResult] = useState<TeleportResponse | null>(null);

  // Mutations
  const setLevel = useSetLevel(agentId);
  const setXp = useSetXp(agentId);
  const setAttributes = useSetAttributes(agentId);
  const setGauges = useSetGauges(agentId);
  const setClass = useSetClass(agentId);
  const reopenClassOffers = useReopenClassOffers(agentId);
  const teleport = useTeleport(agentId);
  const setSafeNode = useSetSafeNode(agentId);
  const respawn = useRespawn(agentId);

  // Sync level input when agent changes
  useEffect(() => {
    setLevelInput(String(agent.level));
    setClassInput(agent.classId ?? '');
  }, [agent.level, agent.classId]);

  const handleLevelApply = () => {
    const num = Number(levelInput);
    if (!isNaN(num) && num !== agent.level) setLevel.mutate(num);
  };

  const handleXpApply = () => {
    const num = Number(xpInput);
    if (!isNaN(num) && xpInput !== '') {
      setXp.mutate(num);
      setXpInput('');
    }
  };

  const handleClassApply = () => {
    if (classInput.trim()) setClass.mutate(classInput.trim());
  };

  const handleAttrCommit = (k: AttrKey, v: number) => {
    setAttributes.mutate({ [k]: v });
  };

  const handleGaugeCommit = (patch: Partial<AgentDetail['gauges']>) => {
    setGauges.mutate(patch);
  };

  const handleTeleport = async () => {
    const nodeId = Number(teleportNodeInput);
    if (isNaN(nodeId)) return;
    const res = await teleport.mutateAsync(nodeId);
    setTeleportResult(res);
    setTeleportOpen(false);
  };

  const handleSetSafeNode = async () => {
    const nodeId = Number(safeNodeInput);
    if (isNaN(nodeId)) return;
    await setSafeNode.mutateAsync(nodeId);
    setSafeNodeOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      {/* Teleport result notice */}
      {teleportResult && (
        <div className="flex items-center gap-2 px-3 py-2 surface-1 border-accent/30 text-xs text-fg-default">
          <MapPin className="size-3.5 text-accent shrink-0" />
          <span>
            Teleported from node{' '}
            <span className="mono">{teleportResult.from ?? 'none'}</span> to{' '}
            <span className="mono">{teleportResult.to}</span>
            {teleportResult.crossedWorld && (
              <span className="text-warning ml-1">(crossed world boundary)</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setTeleportResult(null)}
            className="ml-auto text-fg-muted hover:text-fg-default"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Identity */}
        <Card>
          <CardSection title="Identity">
            <div className="flex flex-col gap-3">
              {/* ID */}
              <div className="flex flex-col gap-1">
                <span className="label-muted">Agent ID</span>
                <span className="mono text-fg-default">{agent.id}</span>
              </div>

              {/* Name */}
              {agent.name && (
                <div className="flex flex-col gap-1">
                  <span className="label-muted">Name</span>
                  <span className="text-sm text-fg-default">{agent.name}</span>
                </div>
              )}

              {/* Level */}
              <div className="flex flex-col gap-1.5">
                <span className="label-muted">Level</span>
                <div className="flex gap-2 items-center">
                  <Input
                    mono
                    type="number"
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelApply()}
                    className="w-20 h-7 text-xs"
                  />
                  <Button size="sm" variant="secondary" onClick={handleLevelApply} disabled={setLevel.isPending}>
                    Set
                  </Button>
                  {setLevel.isError && <InlineError error={setLevel.error} />}
                </div>
              </div>

              {/* XP */}
              <div className="flex flex-col gap-1.5">
                <span className="label-muted">
                  XP <span className="text-fg-muted normal-case tracking-normal">({agent.xp} current)</span>
                </span>
                <div className="flex gap-2 items-center">
                  <Input
                    mono
                    type="number"
                    value={xpInput}
                    onChange={(e) => setXpInput(e.target.value)}
                    placeholder="amount to add"
                    onKeyDown={(e) => e.key === 'Enter' && handleXpApply()}
                    className="w-32 h-7 text-xs"
                  />
                  <Button size="sm" variant="secondary" onClick={handleXpApply} disabled={setXp.isPending || !xpInput}>
                    Add
                  </Button>
                  {setXp.isError && <InlineError error={setXp.error} />}
                </div>
              </div>

              {/* Class */}
              <div className="flex flex-col gap-1.5">
                <span className="label-muted">Class</span>
                <div className="flex gap-2 items-center">
                  <Input
                    value={classInput}
                    onChange={(e) => setClassInput(e.target.value)}
                    placeholder="classId"
                    onKeyDown={(e) => e.key === 'Enter' && handleClassApply()}
                    className="w-36 h-7 text-xs"
                  />
                  <Button size="sm" variant="secondary" onClick={handleClassApply} disabled={setClass.isPending}>
                    Set
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reopenClassOffers.mutate()}
                    disabled={reopenClassOffers.isPending}
                    title="Re-open class selection offers"
                  >
                    <RefreshCw className="size-3" />
                    Reopen offers
                  </Button>
                </div>
                {setClass.isError && <InlineError error={setClass.error} />}
                {reopenClassOffers.isError && <InlineError error={reopenClassOffers.error} />}
              </div>
            </div>
          </CardSection>
        </Card>

        {/* Attributes */}
        <Card>
          <CardSection title="Attributes">
            <div className="flex flex-col gap-2.5">
              {ATTR_DEFS.map((a) => (
                <AttrRow
                  key={a.key}
                  attrKey={a.key}
                  label={a.label}
                  value={agent.attributes[a.key]}
                  onCommit={handleAttrCommit}
                />
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-border-subtle mt-1">
                <span className="w-10 text-2xs uppercase tracking-wider text-fg-muted font-medium">Unspent</span>
                <span className="mono text-xs text-warning">{agent.attributes.unspent}</span>
              </div>
              {setAttributes.isError && <InlineError error={setAttributes.error} />}
            </div>
          </CardSection>
        </Card>

        {/* Gauges */}
        <Card>
          <CardSection title="Gauges">
            <div className="flex flex-col gap-2.5">
              {GAUGE_DEFS.map((def) => (
                <GaugeRow
                  key={def.key}
                  def={def}
                  gauges={agent.gauges}
                  onCommit={handleGaugeCommit}
                />
              ))}
              {setGauges.isError && <InlineError error={setGauges.error} className="mt-1" />}
            </div>
          </CardSection>
        </Card>

        {/* Position */}
        <Card>
          <CardSection title="Position">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="label-muted">Current node</span>
                <span className="mono text-fg-default">{agent.nodeId ?? '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="label-muted">Safe node</span>
                <span className="mono text-fg-default">{agent.safeNodeId ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTeleportOpen(true)}
                >
                  <MapPin className="size-3.5" />
                  Teleport…
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSafeNodeOpen(true)}
                >
                  <Shield className="size-3.5" />
                  Set safe node…
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRespawnOpen(true)}
                >
                  <AlertTriangle className="size-3.5" />
                  Force respawn
                </Button>
              </div>
              {teleport.isError && <InlineError error={teleport.error} />}
              {setSafeNode.isError && <InlineError error={setSafeNode.error} />}
              {respawn.isError && <InlineError error={respawn.error} />}
            </div>
          </CardSection>
        </Card>
      </div>

      {/* Teleport Dialog */}
      <Dialog
        open={teleportOpen}
        onOpenChange={setTeleportOpen}
        title="Teleport agent"
        description="Instantly move the agent to a node, bypassing normal travel."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTeleportOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleTeleport}
              disabled={teleport.isPending || !teleportNodeInput}
            >
              {teleport.isPending ? 'Moving…' : 'Teleport'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs text-fg-muted">Target node ID</label>
          <Input
            mono
            type="number"
            placeholder="node id"
            value={teleportNodeInput}
            onChange={(e) => setTeleportNodeInput(e.target.value)}
            autoFocus
          />
          {teleport.isError && <InlineError error={teleport.error} />}
        </div>
      </Dialog>

      {/* Set safe node Dialog */}
      <Dialog
        open={safeNodeOpen}
        onOpenChange={setSafeNodeOpen}
        title="Set safe node"
        description="The agent will respawn here on death."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSafeNodeOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSetSafeNode}
              disabled={setSafeNode.isPending || !safeNodeInput}
            >
              {setSafeNode.isPending ? 'Setting…' : 'Set'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs text-fg-muted">Node ID</label>
          <Input
            mono
            type="number"
            placeholder="node id"
            value={safeNodeInput}
            onChange={(e) => setSafeNodeInput(e.target.value)}
            autoFocus
          />
          {setSafeNode.isError && <InlineError error={setSafeNode.error} />}
        </div>
      </Dialog>

      {/* Force respawn ConfirmDialog */}
      <ConfirmDialog
        open={respawnOpen}
        onOpenChange={setRespawnOpen}
        title="Force respawn"
        consequence="Force respawn moves the agent to their safe node and skips the de-level penalty."
        confirmLabel="Force respawn"
        destructive
        onConfirm={async () => { await respawn.mutateAsync(); }}
      />
    </div>
  );
}
