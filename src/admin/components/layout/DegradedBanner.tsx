import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { cn } from '@/admin/lib/cn';

export function DegradedBanner() {
  const { status } = useGlobalFeed();
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner each time status transitions back to degraded
  useEffect(() => {
    if (status === 'degraded') {
      setDismissed(false);
    }
  }, [status]);

  if (status !== 'degraded' || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between gap-3 h-9 px-3',
        'bg-warning-subtle border-b border-warning/40',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="size-3.5 text-warning shrink-0" />
        <span className="text-sm font-medium text-fg-strong shrink-0">SSE feed degraded</span>
        <span className="text-sm text-fg-subtle truncate">
          Too many concurrent SSE connections for this token (max 16 per ADR-0004). Close other tabs or wait for connections to free up.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={cn(
          'flex items-center gap-1 h-6 px-2 rounded text-xs text-fg-subtle',
          'hover:text-fg-default hover:bg-warning/10 transition-colors duration-150 ease-precise shrink-0',
        )}
        aria-label="Dismiss degradation banner"
      >
        <X className="size-3" />
        Dismiss
      </button>
    </div>
  );
}
