import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AgentDetail } from '@/lib/api/agents';
import type { Uuid } from '@/lib/types';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/InlineError';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Empty } from '@/components/ui/Empty';
import { cn } from '@/lib/cn';
import {
  useSetAuthority,
  useSetFame,
  useSetOutlaw,
  useSetRelationship,
} from '../hooks/useAgentQuery';

interface Props {
  agent: AgentDetail;
  agentId: Uuid;
}

type NumericMode = 'value' | 'delta';

function NumericControl({
  label,
  currentValue,
  onApply,
  isPending,
  error,
}: {
  label: string;
  currentValue: number;
  onApply: (body: { value?: number; delta?: number }) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [mode, setMode] = useState<NumericMode>('value');
  const [input, setInput] = useState('');

  const handleApply = () => {
    const num = Number(input);
    if (!input || isNaN(num)) return;
    onApply(mode === 'value' ? { value: num } : { delta: num });
    setInput('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-muted">{label}</span>
        <span className="mono text-sm text-fg-strong">{currentValue}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center surface-2 rounded p-0.5 gap-0.5">
          {(['value', 'delta'] as NumericMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'h-6 px-2 rounded-sm text-xs transition-colors duration-150',
                mode === m
                  ? 'bg-bg-overlay text-fg-default'
                  : 'text-fg-muted hover:text-fg-default',
              )}
            >
              {m === 'value' ? 'Set' : '±'}
            </button>
          ))}
        </div>
        <Input
          mono
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={mode === 'value' ? 'absolute value' : '+/- delta'}
          className="flex-1 h-7 text-xs"
        />
        <Button size="sm" variant="secondary" onClick={handleApply} disabled={isPending || !input}>
          Apply
        </Button>
      </div>
      {!!error && <InlineError error={error} />}
    </div>
  );
}

const OUTLAW_STATES = ['NONE', 'WANTED', 'FUGITIVE', 'OUTLAW'] as const;

function OutlawControl({
  agentId,
  currentState,
  currentExpiresAtTick,
}: {
  agentId: Uuid;
  currentState: string;
  currentExpiresAtTick?: number;
}) {
  const [stateInput, setStateInput] = useState(currentState);
  const [expiresInput, setExpiresInput] = useState(
    currentExpiresAtTick !== undefined ? String(currentExpiresAtTick) : '',
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setOutlaw = useSetOutlaw(agentId);

  const handleConfirm = async () => {
    await setOutlaw.mutateAsync({
      state: stateInput,
      expiresAtTick: expiresInput ? Number(expiresInput) : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-muted">Outlaw state</span>
        <span className="mono text-xs text-fg-subtle">{currentState}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={stateInput}
          onChange={(e) => setStateInput(e.target.value)}
          className={cn(
            'h-7 rounded border border-border-default bg-bg-base px-2 text-xs text-fg-default',
            'hover:border-border-strong focus-visible:border-accent',
            'transition-colors duration-150',
          )}
        >
          {OUTLAW_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Input
          mono
          type="number"
          value={expiresInput}
          onChange={(e) => setExpiresInput(e.target.value)}
          placeholder="expires at tick (optional)"
          className="flex-1 h-7 text-xs"
        />
        <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
          Apply
        </Button>
      </div>
      {setOutlaw.isError && <InlineError error={setOutlaw.error} />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change outlaw state"
        consequence={`This will set the agent's outlaw state to "${stateInput}". This may immediately affect NPC hostility and bounty systems.`}
        confirmLabel="Apply outlaw state"
        destructive={stateInput !== 'NONE'}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function RelationshipRow({
  otherId,
  score,
  agentId,
  onDelete,
}: {
  otherId: Uuid;
  score: number;
  agentId: Uuid;
  onDelete: (otherId: Uuid) => void;
}) {
  const [mode, setMode] = useState<NumericMode>('value');
  const [input, setInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const setRel = useSetRelationship(agentId);

  const handleApply = () => {
    const num = Number(input);
    if (!input || isNaN(num)) return;
    setError(null);
    setRel.mutate(
      {
        otherId,
        body: mode === 'value' ? { value: num } : { delta: num },
      },
      { onError: (e) => setError(e), onSuccess: () => setInput('') },
    );
  };

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0 flex-wrap">
      <span className="font-mono text-xs text-fg-default flex-1 min-w-0 truncate">{otherId}</span>
      <span className="mono text-xs text-fg-subtle w-10 text-right">{score}</span>

      <div className="flex items-center surface-2 rounded p-0.5 gap-0.5">
        {(['value', 'delta'] as NumericMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'h-5 px-1.5 rounded-sm text-2xs transition-colors duration-150',
              mode === m ? 'bg-bg-overlay text-fg-default' : 'text-fg-muted hover:text-fg-default',
            )}
          >
            {m === 'value' ? 'Set' : '±'}
          </button>
        ))}
      </div>
      <Input
        mono
        type="number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        placeholder={mode === 'delta' ? '±' : '0'}
        className="w-16 h-7 text-xs"
      />
      <Button size="sm" variant="secondary" onClick={handleApply} disabled={setRel.isPending || !input} className="shrink-0">
        Set
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(otherId)}
        className="shrink-0 text-danger hover:text-danger hover:bg-danger-subtle/40"
      >
        <Trash2 className="size-3.5" />
      </Button>
      {!!error && <InlineError error={error} />}
    </div>
  );
}

export function SocialTab({ agent, agentId }: Props) {
  const social = agent.social;

  const setAuthority = useSetAuthority(agentId);
  const setFame = useSetFame(agentId);
  const setRel = useSetRelationship(agentId);

  // Add relationship
  const [addOtherId, setAddOtherId] = useState('');
  const [addScore, setAddScore] = useState('0');
  const [addRelError, setAddRelError] = useState<unknown>(null);

  // Delete relationship (set score to 0 / remove via delta=0 trick — same endpoint)
  const [deleteRelTarget, setDeleteRelTarget] = useState<Uuid | null>(null);

  const handleAddRelationship = () => {
    const trimmed = addOtherId.trim();
    const score = Number(addScore);
    if (!trimmed || isNaN(score)) return;
    setAddRelError(null);
    setRel.mutate(
      { otherId: trimmed as Uuid, body: { value: score } },
      {
        onSuccess: () => { setAddOtherId(''); setAddScore('0'); },
        onError: (e) => setAddRelError(e),
      },
    );
  };

  const handleDeleteRelationship = async () => {
    if (!deleteRelTarget) return;
    // Removing = setting score to 0 (the canonical way with the given API)
    await setRel.mutateAsync({ otherId: deleteRelTarget, body: { value: 0 } });
    setDeleteRelTarget(null);
  };

  if (!social) {
    return (
      <div className="flex h-full">
        <Empty title="No social data" hint="This agent has no social record yet." className="m-auto" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Authority */}
        <Card>
          <CardSection title="Authority">
            <NumericControl
              label="Current authority"
              currentValue={social.authority}
              onApply={(body) => setAuthority.mutate(body)}
              isPending={setAuthority.isPending}
              error={setAuthority.isError ? setAuthority.error : null}
            />
          </CardSection>
        </Card>

        {/* Fame */}
        <Card>
          <CardSection title="Fame">
            <NumericControl
              label="Current fame"
              currentValue={social.fame}
              onApply={(body) => setFame.mutate(body)}
              isPending={setFame.isPending}
              error={setFame.isError ? setFame.error : null}
            />
          </CardSection>
        </Card>
      </div>

      {/* Outlaw state */}
      <Card>
        <CardSection title="Outlaw status">
          <OutlawControl
            agentId={agentId}
            currentState={social.outlawState}
            currentExpiresAtTick={social.outlawExpiresAtTick}
          />
        </CardSection>
      </Card>

      {/* Relationships */}
      <Card>
        <CardSection title={`Relationships (${social.relationships.length})`}>
          {social.relationships.length === 0 ? (
            <Empty title="No relationships" className="py-4" />
          ) : (
            <div>
              {social.relationships.map((rel) => (
                <RelationshipRow
                  key={rel.otherId}
                  otherId={rel.otherId}
                  score={rel.score}
                  agentId={agentId}
                  onDelete={(id) => setDeleteRelTarget(id)}
                />
              ))}
            </div>
          )}

          {/* Add row */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle flex-wrap">
            <Input
              mono
              placeholder="other agent UUID"
              value={addOtherId}
              onChange={(e) => setAddOtherId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRelationship()}
              className="flex-1 h-7 text-xs"
            />
            <Input
              mono
              type="number"
              placeholder="score"
              value={addScore}
              onChange={(e) => setAddScore(e.target.value)}
              className="w-20 h-7 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddRelationship}
              disabled={setRel.isPending || !addOtherId.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          {!!addRelError && <InlineError error={addRelError} className="mt-1" />}
        </CardSection>
      </Card>

      {/* Delete relationship ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteRelTarget}
        onOpenChange={(open) => !open && setDeleteRelTarget(null)}
        title="Remove relationship"
        consequence="This resets the relationship score to 0. The relationship record will remain with a neutral score."
        confirmLabel="Reset score"
        destructive
        onConfirm={handleDeleteRelationship}
      />
    </div>
  );
}
