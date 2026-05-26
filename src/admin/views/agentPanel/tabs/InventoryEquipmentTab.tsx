import { useState } from 'react';
import { Plus, Minus, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import type { AgentDetail, EquippedItem } from '@/admin/lib/api/agents';
import type { Uuid } from '@/admin/lib/types';
import { Card, CardSection } from '@/admin/components/ui/Card';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { InlineError } from '@/admin/components/ui/InlineError';
import { Dialog } from '@/admin/components/ui/Dialog';
import { ConfirmDialog } from '@/admin/components/ui/ConfirmDialog';
import { Empty } from '@/admin/components/ui/Empty';
import {
  useInventoryQuery,
  usePatchInventory,
  useDeleteInventory,
  useCreateEquipment,
  usePatchEquipment,
  useDeleteEquipment,
  useEquip,
  useUnequip,
} from '../hooks/useAgentQuery';

interface Props {
  agent: AgentDetail;
  agentId: Uuid;
}

// ── Inventory row ─────────────────────────────────────────────────────────────

function InventoryRow({
  itemId,
  quantity,
  agentId,
  onDeleteConfirm,
}: {
  itemId: string;
  quantity: number;
  agentId: Uuid;
  onDeleteConfirm: (itemId: string) => void;
}) {
  const [setInput, setSetInput] = useState('');
  const patch = usePatchInventory(agentId);

  const handlePatch = (delta: number) => {
    patch.mutate({ itemId, delta });
  };

  const handleSet = () => {
    const num = Number(setInput);
    if (!setInput || isNaN(num)) return;
    // Set absolute: delta = target - current
    patch.mutate({ itemId, delta: num - quantity }, { onSuccess: () => setSetInput('') });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0">
      <span className="font-mono text-xs text-fg-default flex-1 min-w-0 truncate">{itemId}</span>
      <span className="mono text-xs text-fg-subtle w-10 text-right tabular-nums">{quantity}</span>

      {/* +/- quick actions */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePatch(-1)}
          disabled={patch.isPending || quantity <= 0}
          className="size-7 p-0"
          title="Subtract 1"
        >
          <Minus className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePatch(1)}
          disabled={patch.isPending}
          className="size-7 p-0"
          title="Add 1"
        >
          <Plus className="size-3" />
        </Button>
      </div>

      {/* Set absolute */}
      <Input
        mono
        type="number"
        value={setInput}
        onChange={(e) => setSetInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSet()}
        placeholder="set"
        className="w-16 h-7 text-xs"
      />
      <Button size="sm" variant="secondary" onClick={handleSet} disabled={patch.isPending || !setInput} className="shrink-0">
        Set
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDeleteConfirm(itemId)}
        className="shrink-0 text-danger hover:text-danger hover:bg-danger-subtle/40"
        title={`Delete all ${itemId}`}
      >
        <Trash2 className="size-3.5" />
      </Button>

      {patch.isError && <InlineError error={patch.error} />}
    </div>
  );
}

// ── Equipment row ─────────────────────────────────────────────────────────────

function EquipmentRow({
  item,
  agentId,
  onDeleteConfirm,
}: {
  item: EquippedItem;
  agentId: Uuid;
  onDeleteConfirm: (instanceId: string) => void;
}) {
  const [rarityLocal, setRarityLocal] = useState(item.rarity);
  const [durLocal, setDurLocal] = useState(String(item.durabilityCurrent));
  const [durMaxLocal, setDurMaxLocal] = useState(String(item.durabilityMax));
  const [patchError, setPatchError] = useState<unknown>(null);
  const [equipError, setEquipError] = useState<unknown>(null);

  const patch = usePatchEquipment(agentId);
  const equip = useEquip(agentId);
  const unequip = useUnequip(agentId);

  const commitRarity = () => {
    if (rarityLocal !== item.rarity) {
      setPatchError(null);
      patch.mutate(
        { instanceId: item.instanceId, body: { rarity: rarityLocal } },
        { onError: (e) => setPatchError(e) },
      );
    }
  };

  const commitDur = () => {
    const num = Number(durLocal);
    if (!isNaN(num) && num !== item.durabilityCurrent) {
      setPatchError(null);
      patch.mutate(
        { instanceId: item.instanceId, body: { durabilityCurrent: num } },
        { onError: (e) => setPatchError(e) },
      );
    }
  };

  const commitDurMax = () => {
    const num = Number(durMaxLocal);
    if (!isNaN(num) && num !== item.durabilityMax) {
      setPatchError(null);
      patch.mutate(
        { instanceId: item.instanceId, body: { durabilityMax: num } },
        { onError: (e) => setPatchError(e) },
      );
    }
  };

  const handleEquip = () => {
    setEquipError(null);
    equip.mutate(
      { instanceId: item.instanceId },
      { onError: (e) => setEquipError(e) },
    );
  };

  const handleUnequip = () => {
    setEquipError(null);
    unequip.mutate(item.instanceId, { onError: (e) => setEquipError(e) });
  };

  return (
    <div className="flex flex-col gap-1.5 py-2 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-mono text-xs text-fg-default truncate">{item.itemId}</span>
          <span className="font-mono text-2xs text-fg-muted truncate">{item.instanceId}</span>
        </div>
        <span className="mono text-2xs text-fg-muted shrink-0">{item.slot}</span>

        {/* Equip/unequip */}
        <Button
          variant="ghost"
          size="sm"
          onClick={item.slot ? handleUnequip : handleEquip}
          disabled={equip.isPending || unequip.isPending}
          title={item.slot ? 'Unequip' : 'Equip'}
          className="shrink-0"
        >
          {item.slot ? <Unlink className="size-3.5" /> : <LinkIcon className="size-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteConfirm(item.instanceId)}
          className="shrink-0 text-danger hover:text-danger hover:bg-danger-subtle/40"
          title="Delete equipment instance"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Inline edits */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-2xs text-fg-muted">Rarity</span>
        <Input
          value={rarityLocal}
          onChange={(e) => setRarityLocal(e.target.value)}
          onBlur={commitRarity}
          onKeyDown={(e) => e.key === 'Enter' && commitRarity()}
          className="w-24 h-6 text-xs"
        />
        <span className="text-2xs text-fg-muted">Dur</span>
        <Input
          mono
          type="number"
          value={durLocal}
          onChange={(e) => setDurLocal(e.target.value)}
          onBlur={commitDur}
          onKeyDown={(e) => e.key === 'Enter' && commitDur()}
          className="w-16 h-6 text-xs"
        />
        <span className="text-2xs text-fg-muted">/</span>
        <Input
          mono
          type="number"
          value={durMaxLocal}
          onChange={(e) => setDurMaxLocal(e.target.value)}
          onBlur={commitDurMax}
          onKeyDown={(e) => e.key === 'Enter' && commitDurMax()}
          className="w-16 h-6 text-xs"
        />
      </div>

      {!!patchError && <InlineError error={patchError} />}
      {!!equipError && <InlineError error={equipError} />}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function InventoryEquipmentTab({ agent, agentId }: Props) {
  const { data: inventory = [], isLoading: invLoading } = useInventoryQuery(agentId);

  // Add item
  const [addItemId, setAddItemId] = useState('');
  const [addQty, setAddQty] = useState('1');
  const patch = usePatchInventory(agentId);

  // Delete inventory confirm
  const [deleteInvTarget, setDeleteInvTarget] = useState<string | null>(null);
  const deleteInv = useDeleteInventory(agentId);

  // Delete equipment confirm
  const [deleteEqTarget, setDeleteEqTarget] = useState<string | null>(null);
  const deleteEq = useDeleteEquipment(agentId);

  // Create equipment dialog
  const [createEqOpen, setCreateEqOpen] = useState(false);
  const [createEqForm, setCreateEqForm] = useState({
    itemId: '',
    rarity: '',
    durabilityCurrent: '',
    creatorAgentId: '',
  });
  const [createEqError, setCreateEqError] = useState<unknown>(null);
  const createEq = useCreateEquipment(agentId);

  const handleAddItem = () => {
    const trimmed = addItemId.trim();
    const qty = Number(addQty);
    if (!trimmed || isNaN(qty)) return;
    patch.mutate({ itemId: trimmed, delta: qty }, { onSuccess: () => { setAddItemId(''); setAddQty('1'); } });
  };

  const handleDeleteInv = async () => {
    if (!deleteInvTarget) return;
    await deleteInv.mutateAsync(deleteInvTarget);
    setDeleteInvTarget(null);
  };

  const handleDeleteEq = async () => {
    if (!deleteEqTarget) return;
    await deleteEq.mutateAsync(deleteEqTarget);
    setDeleteEqTarget(null);
  };

  const handleCreateEq = async () => {
    setCreateEqError(null);
    try {
      await createEq.mutateAsync({
        itemId: createEqForm.itemId.trim(),
        rarity: createEqForm.rarity.trim() || undefined,
        durabilityCurrent: createEqForm.durabilityCurrent
          ? Number(createEqForm.durabilityCurrent)
          : undefined,
        creatorAgentId: createEqForm.creatorAgentId.trim() || undefined,
      });
      setCreateEqOpen(false);
      setCreateEqForm({ itemId: '', rarity: '', durabilityCurrent: '', creatorAgentId: '' });
    } catch (e) {
      setCreateEqError(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 overflow-y-auto h-full">
      {/* Inventory */}
      <Card className="flex flex-col min-h-0">
        <CardSection title={`Inventory (${inventory.length})`}>
          {invLoading ? (
            <div className="text-xs text-fg-muted py-4 text-center">Loading…</div>
          ) : inventory.length === 0 ? (
            <Empty title="Empty inventory" className="py-6" />
          ) : (
            <div>
              {inventory.map((entry) => (
                <InventoryRow
                  key={entry.itemId}
                  itemId={entry.itemId}
                  quantity={entry.quantity}
                  agentId={agentId}
                  onDeleteConfirm={(id) => setDeleteInvTarget(id)}
                />
              ))}
            </div>
          )}

          {/* Add item row */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle flex-wrap">
            <Input
              placeholder="itemId"
              value={addItemId}
              onChange={(e) => setAddItemId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-1 h-7 text-xs"
            />
            <Input
              mono
              type="number"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="w-16 h-7 text-xs"
              placeholder="qty"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddItem}
              disabled={patch.isPending || !addItemId.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          {patch.isError && <InlineError error={patch.error} className="mt-1" />}
        </CardSection>
      </Card>

      {/* Equipment */}
      <Card className="flex flex-col min-h-0">
        <CardSection
          title={`Equipment (${agent.equipped.length})`}
          action={
            <Button size="sm" variant="ghost" onClick={() => setCreateEqOpen(true)}>
              <Plus className="size-3.5" />
              New instance
            </Button>
          }
        >
          {agent.equipped.length === 0 ? (
            <Empty title="Nothing equipped" className="py-6" />
          ) : (
            <div>
              {agent.equipped.map((item) => (
                <EquipmentRow
                  key={item.instanceId}
                  item={item}
                  agentId={agentId}
                  onDeleteConfirm={(id) => setDeleteEqTarget(id)}
                />
              ))}
            </div>
          )}
        </CardSection>
      </Card>

      {/* Delete inventory ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteInvTarget}
        onOpenChange={(open) => !open && setDeleteInvTarget(null)}
        title={`Remove "${deleteInvTarget ?? ''}" from inventory`}
        consequence="This removes all units of the item from the agent's inventory and cannot be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={handleDeleteInv}
      />

      {/* Delete equipment ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteEqTarget}
        onOpenChange={(open) => !open && setDeleteEqTarget(null)}
        title="Delete equipment instance"
        consequence="This permanently destroys the equipment instance. The agent will lose this item forever."
        confirmLabel="Delete equipment"
        destructive
        onConfirm={handleDeleteEq}
      />

      {/* Create equipment Dialog */}
      <Dialog
        open={createEqOpen}
        onOpenChange={setCreateEqOpen}
        title="Create equipment instance"
        description="Spawn a new equipment instance and add it to the agent."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateEqOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateEq}
              disabled={createEq.isPending || !createEqForm.itemId.trim()}
            >
              {createEq.isPending ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-muted">Item ID <span className="text-danger">*</span></label>
            <Input
              value={createEqForm.itemId}
              onChange={(e) => setCreateEqForm((f) => ({ ...f, itemId: e.target.value }))}
              placeholder="sword:iron"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-muted">Rarity</label>
            <Input
              value={createEqForm.rarity}
              onChange={(e) => setCreateEqForm((f) => ({ ...f, rarity: e.target.value }))}
              placeholder="COMMON"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-muted">Durability</label>
            <Input
              mono
              type="number"
              value={createEqForm.durabilityCurrent}
              onChange={(e) => setCreateEqForm((f) => ({ ...f, durabilityCurrent: e.target.value }))}
              placeholder="100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-fg-muted">Creator agent ID</label>
            <Input
              mono
              value={createEqForm.creatorAgentId}
              onChange={(e) => setCreateEqForm((f) => ({ ...f, creatorAgentId: e.target.value }))}
              placeholder="uuid (optional)"
            />
          </div>
          {!!createEqError && <InlineError error={createEqError} />}
        </div>
      </Dialog>
    </div>
  );
}
