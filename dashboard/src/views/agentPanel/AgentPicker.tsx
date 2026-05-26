import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User2, Clock, ArrowRight } from 'lucide-react';
import { useRecent } from '@/lib/recent';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string) {
  return UUID_RE.test(s.trim());
}

export function AgentPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [value, setValue] = useState('');
  const { agents } = useRecent();
  const navigate = useNavigate();

  const submit = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    navigate(`/agents/${trimmed}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  const valid = isUuid(value);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-0 px-6">
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded bg-bg-raised border border-border-default">
              <User2 className="size-3.5 text-fg-subtle" />
            </div>
            <span className="text-md font-medium text-fg-strong">Open agent</span>
          </div>
          <p className="text-xs text-fg-muted pl-9">Enter a UUID to inspect an agent's state.</p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            mono
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            spellCheck={false}
            className="flex-1 text-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!valid}
            className="shrink-0"
          >
            <ArrowRight className="size-3.5" />
            Open
          </Button>
        </form>

        {/* Recent */}
        {agents.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-fg-muted mb-0.5">
              <Clock className="size-3" />
              Recent
            </div>
            <div className="flex flex-col surface-1 divide-y divide-border-subtle overflow-hidden">
              {agents.map((agentId) => (
                <button
                  key={agentId}
                  type="button"
                  onClick={() => submit(agentId)}
                  className={cn(
                    'flex items-center gap-2 px-3 h-8 text-left w-full',
                    'hover:bg-bg-raised transition-colors duration-150',
                    'group',
                  )}
                >
                  <User2 className="size-3 text-fg-muted shrink-0 group-hover:text-fg-subtle transition-colors" />
                  <span className="font-mono text-xs text-fg-subtle truncate group-hover:text-fg-default transition-colors">
                    {agentId}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
