import { Link } from 'react-router-dom';
import { BellRing, BellOff, ChevronLeft } from 'lucide-react';
import type { AgentDetail } from '@/lib/api/agents';
import { useGlobalFeed } from '@/lib/feed/GlobalFeedContext';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';

interface Props {
  agent: AgentDetail;
}

export function AgentHeader({ agent }: Props) {
  const { filters, setFilters } = useGlobalFeed();
  const following = filters.agent === agent.id;

  const toggleFollow = () => {
    if (following) {
      const next = { ...filters };
      delete next.agent;
      setFilters(next);
    } else {
      setFilters({ ...filters, agent: agent.id });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 h-11 border-b border-border-subtle bg-bg-base shrink-0">
      {/* Back link */}
      <Link
        to="/agents"
        className="flex items-center gap-0.5 text-fg-muted hover:text-fg-default transition-colors duration-150 shrink-0"
      >
        <ChevronLeft className="size-3.5" />
        <span className="text-xs">Agents</span>
      </Link>

      <div className="h-3.5 w-px bg-border-default shrink-0" />

      {/* Identity */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-mono text-xs text-fg-muted truncate">{agent.id}</span>
        {agent.name && (
          <>
            <div className="h-3.5 w-px bg-border-default shrink-0" />
            <span className="text-sm font-medium text-fg-strong truncate">{agent.name}</span>
          </>
        )}
        <Pill tone="neutral" className="shrink-0">Lv {agent.level}</Pill>
        {agent.classId && (
          <Pill tone="accent" className="shrink-0">{agent.classId}</Pill>
        )}
      </div>

      {/* Follow toggle */}
      <Button
        variant={following ? 'primary' : 'ghost'}
        size="sm"
        onClick={toggleFollow}
        title={following ? 'Stop following this agent in Live Feed' : 'Follow this agent in Live Feed'}
        className={cn('shrink-0', following && 'gap-1.5')}
      >
        {following ? (
          <>
            <BellRing className="size-3.5" />
            Following
          </>
        ) : (
          <>
            <BellOff className="size-3.5" />
            Follow
          </>
        )}
      </Button>
    </div>
  );
}
