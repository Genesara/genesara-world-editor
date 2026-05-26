import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worldsApi, type NpcInstance } from '@/lib/api/worlds';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { InlineError } from '@/components/ui/InlineError';
import { Empty } from '@/components/ui/Empty';
import type { NodeId, WorldId } from '@/lib/types';

interface Props {
  worldId: WorldId;
  nodeId: NodeId;
}

// ── Delete NPC modal (with silent toggle) ────────────────────────────────────

interface DeleteNpcModalProps {
  npc: NpcInstance;
  worldId: WorldId;
  onDone: () => void;
  onCancel: () => void;
}

function DeleteNpcModal({ npc, worldId, onDone, onCancel }: DeleteNpcModalProps) {
  const [silent, setSilent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const deleteMutation = useMutation({
    mutationFn: () => worldsApi.deleteNpc(worldId, npc.npcId, silent),
    onSuccess: onDone,
    onError: setError,
  });

  const consequence = silent
    ? 'Vanishes with no events — audit-only.'
    : 'Drops loot and emits environment.npc_died.';

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onCancel(); }}
      title={`Delete NPC — ${npc.type}`}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete NPC'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-fg-default text-sm">{consequence}</p>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={silent}
            tabIndex={0}
            onClick={() => setSilent((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') setSilent((v) => !v);
            }}
            className={[
              'w-8 h-4 rounded-full border transition-colors duration-150 relative cursor-pointer',
              silent ? 'bg-warning/20 border-warning/40' : 'bg-bg-raised border-border-default',
            ].join(' ')}
          >
            <div
              className={[
                'absolute top-0.5 size-3 rounded-full transition-transform duration-150',
                silent ? 'translate-x-4 bg-warning' : 'translate-x-0.5 bg-fg-muted',
              ].join(' ')}
            />
          </div>
          <span className="text-sm text-fg-default">Silent delete</span>
          <span className="text-xs text-fg-muted">
            {silent ? 'No events emitted' : 'Emits npc_died'}
          </span>
        </label>

        {!!error && <InlineError error={error} />}
      </div>
    </Dialog>
  );
}

// ── Spawn NPC dialog ─────────────────────────────────────────────────────────

interface SpawnNpcDialogProps {
  worldId: WorldId;
  nodeId: NodeId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpawned: () => void;
}

function SpawnNpcDialog({ worldId, nodeId, open, onOpenChange, onSpawned }: SpawnNpcDialogProps) {
  const [form, setForm] = useState({ type: '', hp: '' });
  const [error, setError] = useState<unknown>(null);

  const mutation = useMutation({
    mutationFn: () =>
      worldsApi.spawnNpc(worldId, nodeId, {
        type: form.type,
        hp: form.hp ? parseInt(form.hp, 10) : undefined,
      }),
    onSuccess: () => {
      setForm({ type: '', hp: '' });
      setError(null);
      onOpenChange(false);
      onSpawned();
    },
    onError: setError,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setForm({ type: '', hp: '' }); setError(null); }
      }}
      title="Spawn NPC"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.type}
          >
            {mutation.isPending ? 'Spawning…' : 'Spawn'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-muted">NPC type</label>
          <Input
            mono
            placeholder="e.g. GOBLIN_SCOUT"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-fg-muted">HP (optional — uses default if omitted)</label>
          <Input
            mono
            type="number"
            placeholder="100"
            value={form.hp}
            onChange={(e) => setForm((f) => ({ ...f, hp: e.target.value }))}
          />
        </div>
        {!!error && <InlineError error={error} />}
      </div>
    </Dialog>
  );
}

// ── Individual NPC row ───────────────────────────────────────────────────────

interface NpcRowProps {
  npc: NpcInstance;
  worldId: WorldId;
  onMutated: () => void;
  onDelete: () => void;
}

function NpcRow({ npc, worldId, onMutated, onDelete }: NpcRowProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [targetNodeId, setTargetNodeId] = useState('');
  const [moveError, setMoveError] = useState<unknown>(null);
  const [hpValue, setHpValue] = useState('');
  const [hpError, setHpError] = useState<unknown>(null);

  const patchHpMutation = useMutation({
    mutationFn: (hp: number) => worldsApi.patchNpc(worldId, npc.npcId, { hp }),
    onSuccess: () => {
      setHpValue('');
      setHpError(null);
      onMutated();
    },
    onError: setHpError,
  });

  const moveMutation = useMutation({
    mutationFn: (nodeId: NodeId) => worldsApi.patchNpc(worldId, npc.npcId, { nodeId }),
    onSuccess: () => {
      setMoveOpen(false);
      setTargetNodeId('');
      setMoveError(null);
      onMutated();
    },
    onError: setMoveError,
  });

  function handleHpPatch() {
    const hp = parseInt(hpValue, 10);
    if (isNaN(hp)) return;
    patchHpMutation.mutate(hp);
  }

  function handleMove() {
    const id = parseInt(targetNodeId, 10);
    if (isNaN(id) || id <= 0) {
      setMoveError('Invalid node ID');
      return;
    }
    moveMutation.mutate(id);
  }

  return (
    <div className="surface-2 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-xs text-fg-default">{npc.type}</span>
            <span className="text-2xs text-fg-muted mono">
              HP {npc.hp}/{npc.hpMax}
            </span>
          </div>
          <div className="text-2xs text-fg-muted mt-0.5">
            id: <span className="mono text-fg-subtle">{npc.npcId}</span>
            {npc.spawnNodeId !== npc.nodeId && (
              <span className="ml-2">
                spawn node: <span className="mono">{npc.spawnNodeId}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Input
            mono
            type="number"
            placeholder={String(npc.hp)}
            value={hpValue}
            onChange={(e) => setHpValue(e.target.value)}
            className="w-16 h-7 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHpPatch}
            disabled={patchHpMutation.isPending || !hpValue}
          >
            Set HP
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setMoveOpen(true); setMoveError(null); }}
          >
            Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {!!hpError && (
        <div className="px-3 pb-1.5">
          <InlineError error={hpError} />
        </div>
      )}

      <Dialog
        open={moveOpen}
        onOpenChange={(open) => {
          setMoveOpen(open);
          if (!open) { setTargetNodeId(''); setMoveError(null); }
        }}
        title={`Move NPC — ${npc.type}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleMove}
              disabled={moveMutation.isPending || !targetNodeId}
            >
              {moveMutation.isPending ? 'Moving…' : 'Move'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs text-fg-muted">Target node ID</label>
          <Input
            mono
            type="number"
            placeholder="node ID"
            value={targetNodeId}
            onChange={(e) => setTargetNodeId(e.target.value)}
            autoFocus
          />
          {!!moveError && <InlineError error={moveError} />}
        </div>
      </Dialog>
    </div>
  );
}

// ── NPCs panel ───────────────────────────────────────────────────────────────

export function NpcsPanel({ worldId, nodeId }: Props) {
  const qc = useQueryClient();
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NpcInstance | null>(null);

  const {
    data: npcs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['npcs', worldId, nodeId],
    queryFn: () => worldsApi.listNpcsAtNode(worldId, nodeId),
    enabled: worldId > 0 && nodeId > 0,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['npcs', worldId, nodeId] });
  };

  return (
    <>
      <Card>
        <CardSection
          title="NPCs"
          action={
            <div className="flex gap-1">
              <Button variant="primary" size="sm" onClick={() => setSpawnOpen(true)}>
                Spawn NPC
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isLoading}>
                Refresh
              </Button>
            </div>
          }
        >
          {isLoading && <div className="text-xs text-fg-muted py-2">Loading…</div>}
          {!!error && <InlineError error={error} className="py-2" />}
          {!isLoading && !error && (
            <div className="flex flex-col gap-1">
              {!npcs || npcs.length === 0 ? (
                <Empty title="No NPCs at this node" />
              ) : (
                npcs.map((npc) => (
                  <NpcRow
                    key={npc.npcId}
                    npc={npc}
                    worldId={worldId}
                    onMutated={invalidate}
                    onDelete={() => setDeleteTarget(npc)}
                  />
                ))
              )}
            </div>
          )}
        </CardSection>
      </Card>

      <SpawnNpcDialog
        worldId={worldId}
        nodeId={nodeId}
        open={spawnOpen}
        onOpenChange={setSpawnOpen}
        onSpawned={invalidate}
      />

      {deleteTarget !== null && (
        <DeleteNpcModal
          npc={deleteTarget}
          worldId={worldId}
          onDone={() => { setDeleteTarget(null); invalidate(); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
