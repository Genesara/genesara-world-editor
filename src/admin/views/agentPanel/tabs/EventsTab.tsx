import { useState } from 'react';
import { ChevronDown, ChevronRight, Wifi } from 'lucide-react';
import type { Uuid } from '@/admin/lib/types';
import type { FeedEnvelope } from '@/admin/lib/types';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { JsonTree } from '@/admin/components/ui/JsonTree';
import { Empty } from '@/admin/components/ui/Empty';
import { cn } from '@/admin/lib/cn';

interface Props {
  agentId: Uuid;
}

const MAX_EVENTS = 50;

function formatTick(tick: number): string {
  return tick.toLocaleString();
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace('Z', ' UTC');
  } catch {
    return iso;
  }
}

function EventRow({ event }: { event: FeedEnvelope }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-start gap-2 w-full text-left px-3 py-2',
          'hover:bg-bg-raised transition-colors duration-100',
          expanded && 'bg-bg-raised',
        )}
      >
        <span className="mt-px text-fg-muted shrink-0">
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </span>
        <div className="flex flex-col min-w-0 gap-0.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-fg-default">{event.type}</span>
            <span className="mono text-2xs text-fg-muted">tick {formatTick(event.tick)}</span>
            {event.node !== null && (
              <span className="mono text-2xs text-fg-muted">node {event.node}</span>
            )}
          </div>
          <span className="text-2xs text-fg-muted">{formatTime(event.occurredAt)}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 bg-bg-raised">
          <JsonTree value={event.payload} initiallyOpen />
        </div>
      )}
    </div>
  );
}

export function EventsTab({ agentId }: Props) {
  const { events, status } = useGlobalFeed();

  const agentEvents = events
    .filter((e) => e.agent === agentId)
    .slice(-MAX_EVENTS);

  const isLive = status === 'live';
  const isConnecting = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 h-8 border-b border-border-subtle bg-bg-base shrink-0">
        <div
          className={cn(
            'size-1.5 rounded-full',
            isLive && 'bg-success',
            isConnecting && 'bg-warning animate-pulse',
            !isLive && !isConnecting && 'bg-fg-muted',
          )}
        />
        <span className="text-xs text-fg-muted">
          {isLive ? 'Live' : isConnecting ? 'Connecting…' : 'Disconnected'}
        </span>
        <span className="text-xs text-fg-muted ml-auto">
          {agentEvents.length} event{agentEvents.length !== 1 ? 's' : ''} (last {MAX_EVENTS})
        </span>
      </div>

      {/* Events list — oldest on top, newest at bottom */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {agentEvents.length === 0 ? (
          <Empty
            icon={<Wifi className="size-5" />}
            title="No events yet"
            hint={
              isLive
                ? 'Events for this agent will appear here in real time.'
                : 'Connect the feed to see events.'
            }
            className="h-full"
          />
        ) : (
          <div className="flex flex-col">
            {agentEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
