import { Pill } from '@/admin/components/ui/Pill';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { cn } from '@/admin/lib/cn';

const labels: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' }> = {
  idle: { label: 'idle', tone: 'neutral' },
  connecting: { label: 'connecting', tone: 'accent' },
  live: { label: 'live', tone: 'success' },
  reconnecting: { label: 'reconnecting', tone: 'warning' },
  disconnected: { label: 'disconnected', tone: 'danger' },
  degraded: { label: 'degraded (429)', tone: 'warning' },
};

export function ConnectionPill() {
  const { status } = useGlobalFeed();
  const meta = labels[status] ?? labels.idle;
  return (
    <Pill tone={meta.tone} title={`Live feed: ${meta.label}`}>
      <span
        className={cn(
          'inline-block size-1.5 rounded-full',
          status === 'live' && 'bg-success animate-pulse',
          status === 'connecting' && 'bg-accent',
          status === 'reconnecting' && 'bg-warning animate-pulse',
          status === 'degraded' && 'bg-warning',
          status === 'disconnected' && 'bg-danger',
          status === 'idle' && 'bg-fg-muted',
        )}
      />
      {meta.label}
    </Pill>
  );
}
