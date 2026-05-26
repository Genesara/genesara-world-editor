import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi, type NpcZone } from '@/lib/api/worlds';
import {
  type PatchField,
  unchanged,
  setTo,
  serializePatch,
  isPatchDirty,
} from '@/lib/api/maybeSet';
import type { WorldId } from '@/lib/types';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/InlineError';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WeightsEditor, weightsFromRows, rowsFromWeights, type WeightRow } from './WeightsEditor';

// ── Patch field shape ────────────────────────────────────────────────────────

interface ZonePatchFields {
  regionId: PatchField<number>;
  nodeId: PatchField<number>;
  maxConcurrent: PatchField<number>;
  respawnTicks: PatchField<number>;
  active: PatchField<boolean>;
}

function freshPatch(): ZonePatchFields {
  return {
    regionId: unchanged(),
    nodeId: unchanged(),
    maxConcurrent: unchanged(),
    respawnTicks: unchanged(),
    active: unchanged(),
  };
}

// ── Null toggle ──────────────────────────────────────────────────────────────

function NullToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? 'Will clear this field. Click to cancel.' : 'Set field to null'}
      className={[
        'h-8 px-2 rounded border text-2xs font-mono font-medium shrink-0 transition-colors duration-150',
        active
          ? 'bg-warning-subtle border-warning/40 text-warning'
          : 'bg-bg-raised border-border-default text-fg-muted hover:text-fg-default hover:border-border-strong',
      ].join(' ')}
    >
      null
    </button>
  );
}

// ── Zone row ─────────────────────────────────────────────────────────────────

interface Props {
  zone: NpcZone;
  worldId: WorldId;
}

export function ZoneRow({ zone, worldId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [patch, setPatch] = useState<ZonePatchFields>(freshPatch());
  // weights are not MaybeSet — they replace the whole map when present
  const [weightRows, setWeightRows] = useState<WeightRow[]>(rowsFromWeights(zone.weights));
  const [weightsTouched, setWeightsTouched] = useState(false);
  const [patchError, setPatchError] = useState<unknown>(null);

  function handleWeightsChange(rows: WeightRow[]) {
    setWeightRows(rows);
    setWeightsTouched(true);
  }

  function handleCollapse() {
    setExpanded(false);
    setPatch(freshPatch());
    setWeightRows(rowsFromWeights(zone.weights));
    setWeightsTouched(false);
    setPatchError(null);
  }

  // Helpers for numeric PatchField inputs
  function handleNumericField(key: keyof ZonePatchFields, value: string) {
    if (value === '') {
      setPatch((p) => ({ ...p, [key]: unchanged() }));
    } else {
      const n = parseInt(value, 10);
      setPatch((p) => ({ ...p, [key]: isNaN(n) ? unchanged() : setTo(n) }));
    }
  }

  function handleSetNull(key: keyof ZonePatchFields) {
    setPatch((p) => {
      const current = p[key];
      if (current.touched && current.value === null) {
        return { ...p, [key]: unchanged() };
      }
      return { ...p, [key]: setTo(null) };
    });
  }

  function numericFieldValue(key: keyof ZonePatchFields): string {
    const f = patch[key];
    if (!f.touched || f.value === null) return '';
    return String(f.value);
  }

  function isNull(key: keyof ZonePatchFields): boolean {
    const f = patch[key];
    return f.touched && f.value === null;
  }

  const patchDirty =
    isPatchDirty(patch as unknown as Record<string, PatchField<unknown>>) || weightsTouched;

  const patchMutation = useMutation({
    mutationFn: () => {
      const base = serializePatch(patch as unknown as Record<string, PatchField<unknown>>);
      if (weightsTouched) {
        base.weights = weightsFromRows(weightRows);
      }
      return worldsApi.patchNpcZone(
        worldId,
        zone.zoneId,
        base as Partial<NpcZone>,
      );
    },
    onSuccess: () => {
      setPatch(freshPatch());
      setWeightsTouched(false);
      setPatchError(null);
      setExpanded(false);
      void qc.invalidateQueries({ queryKey: ['zones', worldId] });
    },
    onError: setPatchError,
  });

  const deleteMutation = useMutation({
    mutationFn: () => worldsApi.deleteNpcZone(worldId, zone.zoneId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['zones', worldId] });
    },
  });

  const weightCount = Object.keys(zone.weights).length;
  const scopeTarget = zone.scope === 'REGION'
    ? `region #${zone.regionId ?? '?'}`
    : `node #${zone.nodeId ?? '?'}`;

  return (
    <div className="surface-2 flex flex-col">
      {/* ── Collapsed summary row ── */}
      <div className="flex items-center gap-2 px-3 py-2 min-h-[2.5rem]">
        <button
          type="button"
          className="text-fg-muted hover:text-fg-default transition-colors shrink-0 w-3.5"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse zone' : 'Expand zone'}
        >
          <span className="text-xs">{expanded ? '▾' : '▸'}</span>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <Pill tone={zone.scope === 'REGION' ? 'accent' : 'success'}>{zone.scope}</Pill>
          <Pill tone="neutral" className="font-mono">{zone.zoneId.slice(0, 8)}</Pill>
          <span className="text-xs text-fg-subtle mono">{scopeTarget}</span>
          <span className="text-xs text-fg-muted">
            max <span className="mono text-fg-subtle">{zone.maxConcurrent}</span>
          </span>
          {zone.respawnTicks !== undefined && (
            <span className="text-xs text-fg-muted">
              respawn <span className="mono text-fg-subtle">{zone.respawnTicks}t</span>
            </span>
          )}
          <span className="text-xs text-fg-muted">
            <span className="mono text-fg-subtle">{weightCount}</span> {weightCount === 1 ? 'type' : 'types'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active dot */}
          <span
            className={[
              'size-1.5 rounded-full shrink-0',
              zone.active ? 'bg-success' : 'bg-fg-muted',
            ].join(' ')}
            title={zone.active ? 'Active' : 'Inactive'}
          />
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

      {/* ── Expanded inline editor ── */}
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-3 flex flex-col gap-4">
          <div className="label-muted">Patch fields — leave blank to skip, toggle null to clear</div>

          <div className="grid grid-cols-2 gap-3">
            {/* regionId — only for REGION scope */}
            {zone.scope === 'REGION' && (
              <div className="flex flex-col gap-1">
                <label className="text-2xs text-fg-muted">regionId</label>
                <div className="flex gap-1">
                  <Input
                    mono
                    type="number"
                    placeholder={String(zone.regionId ?? '')}
                    value={numericFieldValue('regionId')}
                    disabled={isNull('regionId')}
                    onChange={(e) => handleNumericField('regionId', e.target.value)}
                    className="flex-1"
                  />
                  <NullToggle active={isNull('regionId')} onClick={() => handleSetNull('regionId')} />
                </div>
              </div>
            )}

            {/* nodeId — only for NODE scope */}
            {zone.scope === 'NODE' && (
              <div className="flex flex-col gap-1">
                <label className="text-2xs text-fg-muted">nodeId</label>
                <div className="flex gap-1">
                  <Input
                    mono
                    type="number"
                    placeholder={String(zone.nodeId ?? '')}
                    value={numericFieldValue('nodeId')}
                    disabled={isNull('nodeId')}
                    onChange={(e) => handleNumericField('nodeId', e.target.value)}
                    className="flex-1"
                  />
                  <NullToggle active={isNull('nodeId')} onClick={() => handleSetNull('nodeId')} />
                </div>
              </div>
            )}

            {/* maxConcurrent */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">maxConcurrent</label>
              <Input
                mono
                type="number"
                min={1}
                placeholder={String(zone.maxConcurrent)}
                value={numericFieldValue('maxConcurrent')}
                onChange={(e) => handleNumericField('maxConcurrent', e.target.value)}
              />
            </div>

            {/* respawnTicks */}
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-fg-muted">respawnTicks</label>
              <div className="flex gap-1">
                <Input
                  mono
                  type="number"
                  min={1}
                  placeholder={zone.respawnTicks !== undefined ? String(zone.respawnTicks) : '—'}
                  value={numericFieldValue('respawnTicks')}
                  disabled={isNull('respawnTicks')}
                  onChange={(e) => handleNumericField('respawnTicks', e.target.value)}
                  className="flex-1"
                />
                <NullToggle
                  active={isNull('respawnTicks')}
                  onClick={() => handleSetNull('respawnTicks')}
                />
              </div>
            </div>
          </div>

          {/* active toggle */}
          <div className="flex flex-col gap-1">
            <div className="text-2xs text-fg-muted">active</div>
            <div className="flex items-center gap-3">
              {(['untouched', 'true', 'false'] as const).map((opt) => {
                const f = patch.active;
                const isSelected =
                  opt === 'untouched'
                    ? !f.touched
                    : f.touched && String(f.value) === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (opt === 'untouched') {
                        setPatch((p) => ({ ...p, active: unchanged() }));
                      } else {
                        setPatch((p) => ({ ...p, active: setTo(opt === 'true') }));
                      }
                    }}
                    className={[
                      'h-6 px-2.5 rounded border text-2xs font-medium transition-colors duration-150',
                      isSelected
                        ? 'bg-accent-subtle border-accent/40 text-accent'
                        : 'bg-bg-raised border-border-default text-fg-muted hover:text-fg-default hover:border-border-strong',
                    ].join(' ')}
                  >
                    {opt === 'untouched' ? 'skip' : opt}
                  </button>
                );
              })}
              <span className="text-2xs text-fg-muted">
                current: <span className="mono text-fg-subtle">{String(zone.active)}</span>
              </span>
            </div>
          </div>

          {/* Weights editor */}
          <div className="flex flex-col gap-1.5">
            <div className="text-2xs text-fg-muted">
              weights{weightsTouched && <span className="text-accent ml-1">•</span>}
            </div>
            <WeightsEditor rows={weightRows} onChange={handleWeightsChange} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <InlineError error={patchError} />
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                disabled={patchMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => patchMutation.mutate()}
                disabled={!patchDirty || patchMutation.isPending}
              >
                {patchMutation.isPending ? 'Saving…' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete NPC zone"
        consequence="Removes the zone. Existing NPCs from this zone are not despawned."
        confirmLabel="Delete zone"
        onConfirm={async () => { await deleteMutation.mutateAsync(); }}
      />
    </div>
  );
}
