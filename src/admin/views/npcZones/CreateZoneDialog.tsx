import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi } from '@/admin/lib/api/worlds';
import type { WorldId } from '@/admin/lib/types';
import { Dialog } from '@/admin/components/ui/Dialog';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { InlineError } from '@/admin/components/ui/InlineError';
import { WeightsEditor, weightsFromRows, type WeightRow } from './WeightsEditor';

interface Props {
  worldId: WorldId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  scope: 'REGION' | 'NODE';
  regionId: string;
  nodeId: string;
  maxConcurrent: string;
  respawnTicks: string;
  active: boolean;
}

function freshForm(): FormState {
  return {
    scope: 'REGION',
    regionId: '',
    nodeId: '',
    maxConcurrent: '',
    respawnTicks: '',
    active: true,
  };
}

export function CreateZoneDialog({ worldId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(freshForm());
  const [weightRows, setWeightRows] = useState<WeightRow[]>([]);
  const [error, setError] = useState<unknown>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const maxConcurrent = parseInt(form.maxConcurrent, 10);
      const respawnTicks = form.respawnTicks ? parseInt(form.respawnTicks, 10) : undefined;
      const weights = weightsFromRows(weightRows);

      const base = {
        scope: form.scope,
        weights,
        maxConcurrent,
        active: form.active,
        ...(respawnTicks !== undefined ? { respawnTicks } : {}),
      } as const;

      if (form.scope === 'REGION') {
        return worldsApi.createNpcZone(worldId, {
          ...base,
          regionId: parseInt(form.regionId, 10),
        });
      } else {
        return worldsApi.createNpcZone(worldId, {
          ...base,
          nodeId: parseInt(form.nodeId, 10),
        });
      }
    },
    onSuccess: () => {
      setForm(freshForm());
      setWeightRows([]);
      setError(null);
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['zones', worldId] });
    },
    onError: setError,
  });

  function handleClose(nextOpen: boolean) {
    if (mutation.isPending) return;
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setForm(freshForm());
      setWeightRows([]);
      setError(null);
    }
  }

  const scopeIdMissing =
    form.scope === 'REGION' ? !form.regionId : !form.nodeId;
  const canSubmit =
    !mutation.isPending &&
    !scopeIdMissing &&
    form.maxConcurrent !== '' &&
    !isNaN(parseInt(form.maxConcurrent, 10));

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Create NPC zone"
      description="Define the scope, spawn weights, and concurrency for a new zone."
      footer={
        <>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Scope */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-fg-muted">Scope</label>
          <div className="flex gap-2">
            {(['REGION', 'NODE'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, scope: s }))}
                className={[
                  'h-7 px-3 rounded border text-xs font-medium transition-colors duration-150',
                  form.scope === s
                    ? 'bg-accent-subtle border-accent/40 text-accent'
                    : 'bg-bg-raised border-border-default text-fg-subtle hover:text-fg-default hover:border-border-strong',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Scope target ID */}
        {form.scope === 'REGION' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-fg-muted">Region ID</label>
            <Input
              mono
              type="number"
              placeholder="e.g. 42"
              value={form.regionId}
              onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-fg-muted">Node ID</label>
            <Input
              mono
              type="number"
              placeholder="e.g. 100"
              value={form.nodeId}
              onChange={(e) => setForm((f) => ({ ...f, nodeId: e.target.value }))}
            />
          </div>
        )}

        {/* maxConcurrent + respawnTicks */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-fg-muted">Max concurrent</label>
            <Input
              mono
              type="number"
              min={1}
              placeholder="5"
              value={form.maxConcurrent}
              onChange={(e) => setForm((f) => ({ ...f, maxConcurrent: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-fg-muted">Respawn ticks (optional)</label>
            <Input
              mono
              type="number"
              min={1}
              placeholder="—"
              value={form.respawnTicks}
              onChange={(e) => setForm((f) => ({ ...f, respawnTicks: e.target.value }))}
            />
          </div>
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={form.active}
            tabIndex={0}
            onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') setForm((f) => ({ ...f, active: !f.active }));
            }}
            className={[
              'w-8 h-4 rounded-full border transition-colors duration-150 relative cursor-pointer shrink-0',
              form.active
                ? 'bg-success/20 border-success/40'
                : 'bg-bg-raised border-border-default',
            ].join(' ')}
          >
            <div
              className={[
                'absolute top-0.5 size-3 rounded-full transition-transform duration-150',
                form.active ? 'translate-x-4 bg-success' : 'translate-x-0.5 bg-fg-muted',
              ].join(' ')}
            />
          </div>
          <span className="text-xs text-fg-default">Active</span>
          <span className="text-xs text-fg-muted">{form.active ? 'Zone spawns NPCs' : 'Zone paused'}</span>
        </label>

        {/* Weights */}
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-fg-muted">Spawn weights</div>
          <WeightsEditor rows={weightRows} onChange={setWeightRows} />
        </div>

        {!!error && <InlineError error={error} />}
      </div>
    </Dialog>
  );
}
