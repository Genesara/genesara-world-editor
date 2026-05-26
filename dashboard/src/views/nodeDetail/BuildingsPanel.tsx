import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi, type BuildingInstance, type CreateBuildingBody } from '@/lib/api/worlds';
import {
  type PatchField,
  unchanged,
  setTo,
  serializePatch,
  isPatchDirty,
} from '@/lib/api/maybeSet';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { InlineError } from '@/components/ui/InlineError';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Empty } from '@/components/ui/Empty';
import { ChestDrawer } from './ChestDrawer';
import type { NodeId, WorldId } from '@/lib/types';

interface Props {
  worldId: WorldId;
  nodeId: NodeId;
}

// ── Tri-state patch form for a single building ──────────────────────────────

interface BuildingPatchFields {
  status: PatchField<string>;
  progressSteps: PatchField<number>;
  totalSteps: PatchField<number>;
  hpCurrent: PatchField<number>;
  hpMax: PatchField<number>;
  builtByAgentId: PatchField<string>;
}

function freshPatch(): BuildingPatchFields {
  return {
    status: unchanged(),
    progressSteps: unchanged(),
    totalSteps: unchanged(),
    hpCurrent: unchanged(),
    hpMax: unchanged(),
    builtByAgentId: unchanged(),
  };
}

// ── Inline building row ─────────────────────────────────────────────────────

interface BuildingRowProps {
  building: BuildingInstance;
  worldId: WorldId;
  onDeleted: () => void;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'UNDER_CONSTRUCTION') return 'warning';
  if (status === 'DESTROYED') return 'danger';
  return 'neutral';
}

function BuildingRow({ building, worldId, onDeleted }: BuildingRowProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [patch, setPatch] = useState<BuildingPatchFields>(freshPatch());
  const [patchError, setPatchError] = useState<unknown>(null);

  const patchMutation = useMutation({
    mutationFn: () =>
      worldsApi.patchBuilding(
        worldId,
        building.instanceId,
        serializePatch(patch as unknown as Record<string, PatchField<unknown>>) as Parameters<typeof worldsApi.patchBuilding>[2],
      ),
    onSuccess: () => {
      setPatch(freshPatch());
      setPatchError(null);
      void qc.invalidateQueries({ queryKey: ['buildings'] });
    },
    onError: setPatchError,
  });

  const deleteMutation = useMutation({
    mutationFn: () => worldsApi.deleteBuilding(worldId, building.instanceId),
    onSuccess: () => {
      setConfirmDelete(false);
      onDeleted();
    },
  });

  // Helper: update a PatchField by string input value
  function handleFieldInput(
    key: keyof BuildingPatchFields,
    value: string,
    numeric?: boolean,
  ) {
    if (value === '') {
      setPatch((p) => ({ ...p, [key]: unchanged() }));
    } else if (numeric) {
      const n = parseFloat(value);
      setPatch((p) => ({ ...p, [key]: isNaN(n) ? unchanged() : setTo(n) }));
    } else {
      setPatch((p) => ({ ...p, [key]: setTo(value) }));
    }
  }

  // Toggle a field to explicit null (the "clear" pill)
  function handleSetNull(key: keyof BuildingPatchFields) {
    setPatch((p) => {
      const current = p[key];
      if (current.touched && current.value === null) {
        return { ...p, [key]: unchanged() };
      }
      return { ...p, [key]: setTo(null) };
    });
  }

  function fieldValue(key: keyof BuildingPatchFields): string {
    const f = patch[key];
    if (!f.touched) return '';
    if (f.value === null) return '';
    return String(f.value);
  }

  function isNull(key: keyof BuildingPatchFields): boolean {
    const f = patch[key];
    return f.touched && f.value === null;
  }

  const dirty = isPatchDirty(patch as unknown as Record<string, PatchField<unknown>>);

  return (
    <div className="surface-2 flex flex-col">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          className="text-fg-muted hover:text-fg-default transition-colors shrink-0 w-3.5"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span className="text-xs">{expanded ? '▾' : '▸'}</span>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="mono text-fg-default text-xs truncate">{building.type}</span>
          <Pill tone={statusTone(building.status)}>{building.status}</Pill>
          {building.status === 'UNDER_CONSTRUCTION' && (
            <span className="text-xs text-fg-muted mono">
              {building.progressSteps}/{building.totalSteps}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xs text-fg-muted mono">
            HP {building.hpCurrent}/{building.hpMax}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setChestOpen((v) => !v); setExpanded(true); }}
          >
            Chest
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Instance ID + builtBy */}
      <div className="px-3 pb-1.5 flex gap-3 text-2xs text-fg-muted">
        <span>
          id: <span className="mono text-fg-subtle">{building.instanceId}</span>
        </span>
        {building.builtByAgentId && (
          <span>
            agent: <span className="mono text-fg-subtle">{building.builtByAgentId}</span>
          </span>
        )}
      </div>

      {/* Inline editor */}
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-3 flex flex-col gap-3">
          <div className="label-muted mb-0.5">Patch fields — leave blank to skip, toggle null to clear</div>

          <div className="grid grid-cols-2 gap-2">
            {/* status */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">status</label>
              <div className="flex gap-1">
                <Input
                  mono
                  placeholder={building.status}
                  value={fieldValue('status')}
                  disabled={isNull('status')}
                  onChange={(e) => handleFieldInput('status', e.target.value)}
                  className="flex-1"
                />
                <NullToggle active={isNull('status')} onClick={() => handleSetNull('status')} />
              </div>
            </div>

            {/* progressSteps */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">progressSteps</label>
              <div className="flex gap-1">
                <Input
                  mono
                  type="number"
                  placeholder={String(building.progressSteps)}
                  value={fieldValue('progressSteps')}
                  disabled={isNull('progressSteps')}
                  onChange={(e) => handleFieldInput('progressSteps', e.target.value, true)}
                  className="flex-1"
                />
                <NullToggle active={isNull('progressSteps')} onClick={() => handleSetNull('progressSteps')} />
              </div>
            </div>

            {/* totalSteps */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">totalSteps</label>
              <div className="flex gap-1">
                <Input
                  mono
                  type="number"
                  placeholder={String(building.totalSteps)}
                  value={fieldValue('totalSteps')}
                  disabled={isNull('totalSteps')}
                  onChange={(e) => handleFieldInput('totalSteps', e.target.value, true)}
                  className="flex-1"
                />
                <NullToggle active={isNull('totalSteps')} onClick={() => handleSetNull('totalSteps')} />
              </div>
            </div>

            {/* hpCurrent */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">hpCurrent</label>
              <div className="flex gap-1">
                <Input
                  mono
                  type="number"
                  placeholder={String(building.hpCurrent)}
                  value={fieldValue('hpCurrent')}
                  disabled={isNull('hpCurrent')}
                  onChange={(e) => handleFieldInput('hpCurrent', e.target.value, true)}
                  className="flex-1"
                />
                <NullToggle active={isNull('hpCurrent')} onClick={() => handleSetNull('hpCurrent')} />
              </div>
            </div>

            {/* hpMax */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">hpMax</label>
              <div className="flex gap-1">
                <Input
                  mono
                  type="number"
                  placeholder={String(building.hpMax)}
                  value={fieldValue('hpMax')}
                  disabled={isNull('hpMax')}
                  onChange={(e) => handleFieldInput('hpMax', e.target.value, true)}
                  className="flex-1"
                />
                <NullToggle active={isNull('hpMax')} onClick={() => handleSetNull('hpMax')} />
              </div>
            </div>

            {/* builtByAgentId */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">builtByAgentId</label>
              <div className="flex gap-1">
                <Input
                  mono
                  placeholder={building.builtByAgentId ?? '—'}
                  value={fieldValue('builtByAgentId')}
                  disabled={isNull('builtByAgentId')}
                  onChange={(e) => handleFieldInput('builtByAgentId', e.target.value)}
                  className="flex-1"
                />
                <NullToggle active={isNull('builtByAgentId')} onClick={() => handleSetNull('builtByAgentId')} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <InlineError error={patchError} />
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPatch(freshPatch()); setPatchError(null); }}
                disabled={!dirty}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => patchMutation.mutate()}
                disabled={!dirty || patchMutation.isPending}
              >
                {patchMutation.isPending ? 'Saving…' : 'Apply patch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chest drawer */}
      {chestOpen && (
        <ChestDrawer
          worldId={worldId}
          instanceId={building.instanceId}
          buildingType={building.type}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete building"
        consequence={`Building "${building.type}" (${building.instanceId.slice(0, 8)}…) will be permanently removed. An audit row with removed=true will be emitted.`}
        confirmLabel="Delete building"
        onConfirm={async () => { await deleteMutation.mutateAsync(); }}
      />
    </div>
  );
}

// ── Null toggle pill ─────────────────────────────────────────────────────────

function NullToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-8 px-2 rounded border text-2xs font-mono font-medium shrink-0 transition-colors duration-150',
        active
          ? 'bg-warning-subtle border-warning/40 text-warning'
          : 'bg-bg-raised border-border-default text-fg-muted hover:text-fg-default hover:border-border-strong',
      ].join(' ')}
      title={active ? 'Field will be cleared (explicit null). Click to cancel.' : 'Set field to null (explicit clear)'}
    >
      null
    </button>
  );
}

// ── Place building form ──────────────────────────────────────────────────────

interface PlaceBuildingFormProps {
  worldId: WorldId;
  nodeId: NodeId;
  onCreated: () => void;
}

function PlaceBuildingForm({ worldId, nodeId, onCreated }: PlaceBuildingFormProps) {
  const [form, setForm] = useState<CreateBuildingBody>({ type: '' });
  const [error, setError] = useState<unknown>(null);

  const mutation = useMutation({
    mutationFn: () => worldsApi.createBuilding(worldId, nodeId, form),
    onSuccess: () => {
      setForm({ type: '' });
      setError(null);
      onCreated();
    },
    onError: setError,
  });

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-border-subtle">
      <div className="label-muted">Place building</div>
      <div className="flex gap-2">
        <Input
          mono
          placeholder="building type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="flex-1"
        />
        <Input
          mono
          type="number"
          placeholder="hp (opt)"
          value={form.hpCurrent ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              hpCurrent: e.target.value ? parseInt(e.target.value, 10) : undefined,
            }))
          }
          className="w-24"
        />
        <Input
          mono
          type="number"
          placeholder="hpMax"
          value={form.hpMax ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              hpMax: e.target.value ? parseInt(e.target.value, 10) : undefined,
            }))
          }
          className="w-24"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.type}
        >
          {mutation.isPending ? 'Placing…' : 'Place'}
        </Button>
      </div>
      <InlineError error={error} />
    </div>
  );
}

// ── Buildings panel ──────────────────────────────────────────────────────────

export function BuildingsPanel({ worldId, nodeId }: Props) {
  const qc = useQueryClient();

  const {
    data: buildings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['buildings', worldId, nodeId],
    queryFn: () => worldsApi.listBuildings(worldId, nodeId),
    enabled: worldId > 0 && nodeId > 0,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['buildings', worldId, nodeId] });
  };

  return (
    <Card>
      <CardSection
        title="Buildings"
        action={
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        }
      >
        {isLoading && <div className="text-xs text-fg-muted py-2">Loading…</div>}
        {error && <InlineError error={error} className="py-2" />}
        {!isLoading && !error && (
          <div className="flex flex-col gap-1">
            {!buildings || buildings.length === 0 ? (
              <Empty title="No buildings at this node" />
            ) : (
              buildings.map((b) => (
                <BuildingRow
                  key={b.instanceId}
                  building={b}
                  worldId={worldId}
                  onDeleted={invalidate}
                />
              ))
            )}
            <PlaceBuildingForm worldId={worldId} nodeId={nodeId} onCreated={invalidate} />
          </div>
        )}
      </CardSection>
    </Card>
  );
}
