import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listAudit } from '@/lib/api/audit';
import type { AuditEntry, Seq } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { Pill } from '@/components/ui/Pill';
import { JsonTree } from '@/components/ui/JsonTree';
import { InlineError } from '@/components/ui/InlineError';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms} UTC`;
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────
// Row shimmer
// ─────────────────────────────────────────────────────────────

function RowShimmer() {
  return (
    <div className="px-3 py-2 border-b border-border-subtle animate-pulse flex flex-col gap-1.5">
      <div className="surface-2 h-3.5 rounded w-2/3" />
      <div className="surface-2 h-3 rounded w-1/3" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Audit row
// ─────────────────────────────────────────────────────────────

interface AuditRowProps {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function AuditRow({ entry, isExpanded, onToggle }: AuditRowProps) {
  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2 hover:bg-bg-raised transition-colors duration-150"
        aria-expanded={isExpanded}
      >
        {/* Row 1: seq | tick | time | adminId */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-fg-muted">#{entry.seq}</span>
          <span className="mono text-fg-muted">tick {entry.tick}</span>
          <span className="mono text-fg-subtle">{formatTime(entry.occurredAt)}</span>
          <span className="mono text-fg-muted">{entry.adminId.slice(0, 8)}</span>
        </div>
        {/* Row 2: action pill | target:targetId */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Pill tone="accent">{entry.action}</Pill>
          <span className="mono text-fg-subtle text-xs">
            {entry.target}:{entry.targetId.slice(0, 8)}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="surface-2 mx-3 mb-2 mt-1 p-3 rounded">
          <JsonTree value={entry.payload} initiallyOpen />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────

export function AuditLogView() {
  const [newestFirst, setNewestFirst] = useState(true);
  const [actionPrefix, setActionPrefix] = useState('');
  const [expandedSeqs, setExpandedSeqs] = useState<Set<Seq>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['audit'],
    queryFn: ({ pageParam }) => listAudit({ after: pageParam as Seq, limit: 100 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: 0 as Seq,
    staleTime: 30_000,
  });

  // ── Flatten all pages into one array ─────────────────────
  const allEntries: AuditEntry[] = data?.pages.flatMap((p) => p.entries) ?? [];

  // ── Client-side filter ───────────────────────────────────
  const trimmed = actionPrefix.trim();
  const filtered = trimmed
    ? allEntries.filter((e) => e.action.startsWith(trimmed))
    : allEntries;

  // ── Direction: reverse for newest-first ──────────────────
  const displayed = newestFirst ? [...filtered].reverse() : filtered;

  // ── Row expand toggle ─────────────────────────────────────
  const toggleRow = useCallback((seq: Seq) => {
    setExpandedSeqs((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  }, []);

  // ── IntersectionObserver auto-load-more ──────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: listRef.current,
        rootMargin: '200px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Entry count label ─────────────────────────────────────
  const totalCount = allEntries.length;
  const displayCount = displayed.length;
  const countLabel =
    trimmed && displayCount !== totalCount
      ? `${displayCount} / ${totalCount}`
      : String(totalCount);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 h-9 flex items-center gap-2 px-3 border-b border-border-subtle bg-bg-base">
        <span className="text-xs font-medium text-fg-subtle whitespace-nowrap">Audit log</span>

        <Pill tone="neutral" className="tabular-nums">{countLabel}</Pill>

        <button
          type="button"
          onClick={() => setNewestFirst((v) => !v)}
          aria-label="Toggle sort order"
        >
          <Pill
            tone={newestFirst ? 'accent' : 'neutral'}
            className="cursor-pointer select-none hover:opacity-80 transition-opacity duration-150"
          >
            {newestFirst ? 'newest first' : 'oldest first'}
          </Pill>
        </button>

        <div className="flex-1 min-w-0 max-w-xs">
          <Input
            mono
            placeholder="filter by action prefix…"
            value={actionPrefix}
            onChange={(e) => setActionPrefix(e.target.value)}
            className="h-7 text-xs"
            aria-label="Filter by action prefix"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isFetching && !isFetchingNextPage && (
            <span className="text-xs text-fg-muted animate-pulse">refreshing…</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh audit log"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-3 py-2 border-b border-border-subtle">
          <InlineError error={error} />
        </div>
      )}

      {/* Body */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col">
            <RowShimmer />
            <RowShimmer />
          </div>
        ) : displayed.length === 0 ? (
          <Empty
            title="No audit entries yet"
            hint={trimmed ? `No actions matching "${trimmed}".` : undefined}
            className="h-full"
          />
        ) : (
          <div className="flex flex-col surface-1 m-3 overflow-hidden">
            {displayed.map((entry) => (
              <AuditRow
                key={entry.seq}
                entry={entry}
                isExpanded={expandedSeqs.has(entry.seq)}
                onToggle={() => toggleRow(entry.seq)}
              />
            ))}

            {/* Sentinel for IntersectionObserver */}
            <div ref={sentinelRef} className="shrink-0" />

            {/* Explicit load-more button */}
            <div className="px-3 py-2 flex justify-center border-t border-border-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
                className="text-xs"
              >
                {isFetchingNextPage
                  ? 'Loading…'
                  : hasNextPage
                    ? 'Load more'
                    : 'All entries loaded'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
