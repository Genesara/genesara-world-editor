import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { AgentDetail, AgentSkill } from '@/lib/api/agents';
import type { Uuid } from '@/lib/types';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/InlineError';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pill } from '@/components/ui/Pill';
import { Empty } from '@/components/ui/Empty';
import {
  useSetSkill,
  useDeleteSkill,
  useGrantPerk,
  useRevokePerk,
} from '../hooks/useAgentQuery';

interface Props {
  agent: AgentDetail;
  agentId: Uuid;
}

// Persisted skill warnings for the session (outside component, per-agent key not needed since
// each agent mount is fresh)
interface SkillWarning {
  skillId: string;
  text: string;
}

function SkillRow({
  skill,
  agentId,
  onDelete,
}: {
  skill: AgentSkill;
  agentId: Uuid;
  onDelete: (skillId: string, warning?: string) => void;
}) {
  const [levelLocal, setLevelLocal] = useState(String(skill.level));
  const [xpLocal, setXpLocal] = useState(String(skill.xp));
  const setSkill = useSetSkill(agentId);

  const commitLevel = () => {
    const num = Number(levelLocal);
    if (!isNaN(num)) setSkill.mutate({ skillId: skill.skillId, body: { level: num } });
  };

  const commitXp = () => {
    const num = Number(xpLocal);
    if (!isNaN(num)) setSkill.mutate({ skillId: skill.skillId, body: { xp: num } });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0">
      <span className="font-mono text-xs text-fg-default flex-1 min-w-0 truncate">{skill.skillId}</span>
      <span className="text-2xs text-fg-muted w-7 shrink-0">Lv</span>
      <Input
        mono
        type="number"
        value={levelLocal}
        onChange={(e) => setLevelLocal(e.target.value)}
        onBlur={commitLevel}
        onKeyDown={(e) => e.key === 'Enter' && commitLevel()}
        className="w-16 h-7 text-xs"
      />
      <span className="text-2xs text-fg-muted w-5 shrink-0">XP</span>
      <Input
        mono
        type="number"
        value={xpLocal}
        onChange={(e) => setXpLocal(e.target.value)}
        onBlur={commitXp}
        onKeyDown={(e) => e.key === 'Enter' && commitXp()}
        className="w-20 h-7 text-xs"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(skill.skillId)}
        className="shrink-0 text-danger hover:text-danger hover:bg-danger-subtle/40"
        title={`Delete skill ${skill.skillId}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function SkillsPerksTab({ agent, agentId }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [skillWarnings, setSkillWarnings] = useState<SkillWarning[]>([]);

  const [grantPerkInput, setGrantPerkInput] = useState('');
  const [revokePerkError, setRevokePerkError] = useState<Record<string, unknown>>({});

  const deleteSkill = useDeleteSkill(agentId);
  const grantPerk = useGrantPerk(agentId);
  const revokePerk = useRevokePerk(agentId);

  const handleDeleteSkill = async () => {
    if (!deleteTarget) return;
    const res = await deleteSkill.mutateAsync(deleteTarget);
    if (res?.warning) {
      setSkillWarnings((prev) => [
        ...prev.filter((w) => w.skillId !== deleteTarget),
        { skillId: deleteTarget, text: res.warning as string },
      ]);
    }
    setDeleteTarget(null);
  };

  const handleGrantPerk = () => {
    const trimmed = grantPerkInput.trim();
    if (!trimmed) return;
    grantPerk.mutate(trimmed, { onSuccess: () => setGrantPerkInput('') });
  };

  const handleRevokePerk = (perkId: string) => {
    revokePerk.mutate(perkId, {
      onError: (err) => setRevokePerkError((prev) => ({ ...prev, [perkId]: err })),
    });
  };

  const warningForSkill = (skillId: string) =>
    skillWarnings.find((w) => w.skillId === skillId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 overflow-y-auto h-full">
      {/* Skills */}
      <Card className="flex flex-col min-h-0">
        <CardSection title={`Skills (${agent.skills.length})`}>
          {agent.skills.length === 0 ? (
            <Empty title="No skills" className="py-6" />
          ) : (
            <div className="flex flex-col">
              {agent.skills.map((skill) => (
                <div key={skill.skillId}>
                  <SkillRow
                    skill={skill}
                    agentId={agentId}
                    onDelete={(id) => setDeleteTarget(id)}
                  />
                  {warningForSkill(skill.skillId) && (
                    <div className="flex items-center gap-1.5 pb-1.5">
                      <Pill tone="warning">{warningForSkill(skill.skillId)!.text}</Pill>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {deleteSkill.isError && !deleteTarget && (
            <InlineError error={deleteSkill.error} className="mt-2" />
          )}
        </CardSection>
      </Card>

      {/* Perks */}
      <Card className="flex flex-col min-h-0">
        <CardSection
          title={`Perks (${agent.perks.length})`}
          action={null}
        >
          {agent.perks.length === 0 ? (
            <Empty title="No perks" className="py-4" />
          ) : (
            <div className="flex flex-col gap-1">
              {agent.perks.map((perk) => (
                <div key={perk.perkId} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-xs text-fg-default flex-1 truncate">{perk.perkId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokePerk(perk.perkId)}
                    disabled={revokePerk.isPending}
                    className="shrink-0 text-danger hover:text-danger hover:bg-danger-subtle/40"
                    title={`Revoke perk ${perk.perkId}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  {!!revokePerkError[perk.perkId] && (
                    <InlineError error={revokePerkError[perk.perkId]} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Grant perk row */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle">
            <Input
              placeholder="perkId to grant"
              value={grantPerkInput}
              onChange={(e) => setGrantPerkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGrantPerk()}
              className="flex-1 h-7 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleGrantPerk}
              disabled={grantPerk.isPending || !grantPerkInput.trim()}
            >
              <Plus className="size-3.5" />
              Grant
            </Button>
          </div>
          {grantPerk.isError && <InlineError error={grantPerk.error} className="mt-1" />}
        </CardSection>
      </Card>

      {/* Delete skill ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete skill "${deleteTarget ?? ''}"`}
        consequence="Force-unequipping a skill slot — slots are normally permanent and cannot be re-added without a grant."
        confirmLabel="Delete skill"
        destructive
        onConfirm={handleDeleteSkill}
      />
    </div>
  );
}
