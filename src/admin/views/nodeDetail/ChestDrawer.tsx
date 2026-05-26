import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi, type ChestContents } from '@/admin/lib/api/worlds';
import { Card, CardSection } from '@/admin/components/ui/Card';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { InlineError } from '@/admin/components/ui/InlineError';
import { ConfirmDialog } from '@/admin/components/ui/ConfirmDialog';
import { Empty } from '@/admin/components/ui/Empty';
import type { WorldId } from '@/admin/lib/types';

interface Props {
  worldId: WorldId;
  instanceId: string;
  buildingType: string;
}

interface PutFormState {
  raw: string;
  parseError: string | null;
}

interface DeltaFormState {
  itemId: string;
  delta: string;
}

export function ChestDrawer({ worldId, instanceId }: Props) {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [putForm, setPutForm] = useState<PutFormState>({ raw: '', parseError: null });
  const [deltaForm, setDeltaForm] = useState<DeltaFormState>({ itemId: '', delta: '' });
  const [putError, setPutError] = useState<unknown>(null);
  const [patchError, setPatchError] = useState<unknown>(null);

  const {
    data: chest,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['chest', worldId, instanceId],
    queryFn: () => worldsApi.getChest(worldId, instanceId),
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['chest', worldId, instanceId] });
  };

  const putMutation = useMutation({
    mutationFn: (body: ChestContents) => worldsApi.putChest(worldId, instanceId, body),
    onSuccess: () => {
      setPutForm({ raw: '', parseError: null });
      setPutError(null);
      invalidate();
    },
    onError: setPutError,
  });

  const patchMutation = useMutation({
    mutationFn: (body: { itemId: string; delta: number }) =>
      worldsApi.patchChest(worldId, instanceId, body),
    onSuccess: () => {
      setDeltaForm({ itemId: '', delta: '' });
      setPatchError(null);
      invalidate();
    },
    onError: setPatchError,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => worldsApi.deleteChestItem(worldId, instanceId, itemId),
    onSuccess: () => {
      setDeleteTarget(null);
      invalidate();
    },
  });

  function handlePut() {
    try {
      const parsed = JSON.parse(putForm.raw) as ChestContents;
      setPutForm((f) => ({ ...f, parseError: null }));
      putMutation.mutate(parsed);
    } catch {
      setPutForm((f) => ({ ...f, parseError: 'Invalid JSON' }));
    }
  }

  function handlePatch() {
    const delta = parseInt(deltaForm.delta, 10);
    if (!deltaForm.itemId || isNaN(delta)) return;
    patchMutation.mutate({ itemId: deltaForm.itemId, delta });
  }

  if (isLoading) {
    return (
      <div className="px-3 py-2 text-xs text-fg-muted">Loading chest…</div>
    );
  }

  if (loadError) {
    return (
      <div className="px-3 py-2">
        <InlineError error={loadError} />
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle mt-0 flex flex-col gap-3 px-3 py-3">
      {/* Current entries */}
      <div>
        <div className="label-muted mb-1.5">Contents</div>
        {!chest || chest.entries.length === 0 ? (
          <Empty title="Chest is empty" className="py-4" />
        ) : (
          <div className="flex flex-col gap-1">
            {chest.entries.map((entry) => (
              <div
                key={entry.itemId}
                className="surface-2 flex items-center justify-between px-2.5 py-1.5 gap-3"
              >
                <span className="mono text-fg-default truncate flex-1">{entry.itemId}</span>
                <span className="mono text-fg-subtle shrink-0">×{entry.quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleteTarget(entry.itemId)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delta PATCH */}
      <Card className="surface-2">
        <CardSection title="Adjust quantity">
          <div className="flex gap-2">
            <Input
              mono
              placeholder="item-id"
              value={deltaForm.itemId}
              onChange={(e) => setDeltaForm((f) => ({ ...f, itemId: e.target.value }))}
              className="flex-1"
            />
            <Input
              mono
              placeholder="+5 or -3"
              value={deltaForm.delta}
              onChange={(e) => setDeltaForm((f) => ({ ...f, delta: e.target.value }))}
              className="w-24"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePatch}
              disabled={patchMutation.isPending || !deltaForm.itemId || !deltaForm.delta}
            >
              {patchMutation.isPending ? 'Saving…' : 'Apply'}
            </Button>
          </div>
          <InlineError error={patchError} className="mt-1.5" />
        </CardSection>
      </Card>

      {/* Atomic PUT */}
      <Card className="surface-2">
        <CardSection title="Replace all (PUT)">
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full h-20 rounded border border-border-default bg-bg-base px-2.5 py-2 font-mono text-xs text-fg-default placeholder:text-fg-muted resize-none focus-visible:border-accent transition-colors duration-150"
              placeholder='{"entries":[{"itemId":"sword","quantity":1}]}'
              value={putForm.raw}
              onChange={(e) => setPutForm({ raw: e.target.value, parseError: null })}
            />
            {putForm.parseError && (
              <InlineError error={putForm.parseError} />
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="danger"
                onClick={handlePut}
                disabled={putMutation.isPending || !putForm.raw}
              >
                {putMutation.isPending ? 'Replacing…' : 'Replace chest'}
              </Button>
            </div>
            <InlineError error={putError} />
          </div>
        </CardSection>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remove item from chest"
        consequence={`Item "${deleteTarget}" will be permanently removed from this chest.`}
        confirmLabel="Remove item"
        onConfirm={async () => {
          if (deleteTarget) await deleteItemMutation.mutateAsync(deleteTarget);
        }}
      />
    </div>
  );
}
