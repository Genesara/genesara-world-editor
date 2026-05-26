import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeedRange } from '@/lib/api/feed';
import type { FeedEnvelope, Seq } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardSection } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { InlineError } from '@/components/ui/InlineError';
import { Pill } from '@/components/ui/Pill';
import { JsonTree } from '@/components/ui/JsonTree';
import { cn } from '@/lib/cn';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_TYPE_PREFIXES = ['agent', 'combat', 'environment', 'social', 'economy'] as const;
const MAX_RECENT_RANGES = 3;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RangeForm {
  from: string;
  to: string;
  agent: string;
  node: string;
}

interface RecentRange {
  from: Seq;
  to: Seq;
  label: string;
}

interface FetchParams {
  from: Seq;
  to: Seq;
  type: string[];
  agent: string;
  node: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  } catch {
    return '—';
  }
}

function splitEventType(type: string): { prefix: string; rest: string } {
  const dot = type.indexOf('.');
  if (dot === -1) return { prefix: type, rest: '' };
  return { prefix: type.slice(0, dot), rest: type.slice(dot) };
}

// ─────────────────────────────────────────────────────────────
// TypeChips — curated + custom prefix toggles
// ─────────────────────────────────────────────────────────────

interface TypeChipsProps {
  active: Set<string>;
  customPrefixes: string[];
  onToggle: (prefix: string) => void;
  onAddCustom: (prefix: string) => void;
}

function TypeChips({ active, customPrefixes, onToggle, onAddCustom }: TypeChipsProps) {
  const [draft, setDraft] = useState('');
  const allPrefixes = [...DEFAULT_TYPE_PREFIXES, ...customPrefixes];

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const trimmed = draft.trim().toLowerCase();
      if (trimmed) {
        onAddCustom(trimmed);
        setDraft('');
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label-muted">Event type prefixes</span>
      <div className="flex flex-wrap gap-1">
        {allPrefixes.map((prefix) => {
          const isOn = active.has(prefix);
          return (
            <button
              key={prefix}
              type="button"
              onClick={() => onToggle(prefix)}
              className={cn(
                'inline-flex items-center h-5 px-1.5 rounded-sm border text-2xs font-medium uppercase tracking-wider transition-colors duration-150',
                isOn
                  ? 'bg-accent-subtle text-accent border-accent/40'
                  : 'bg-bg-raised text-fg-muted border-border-default hover:text-fg-default hover:border-border-strong',
              )}
            >
              {prefix}
            </button>
          );
        })}
      </div>
      <Input
        placeholder="Add custom prefix…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs"
        aria-label="Add custom type prefix"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Event row (local, not imported from LiveFeedView)
// ─────────────────────────────────────────────────────────────

interface EventRowProps {
  envelope: FeedEnvelope;
  isExpanded: boolean;
  onToggle: () => void;
}

function EventRow({ envelope, isExpanded, onToggle }: EventRowProps) {
  const { prefix, rest } = splitEventType(envelope.type);

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-1.5 hover:bg-bg-raised transition-colors duration-150"
        aria-expanded={isExpanded}
      >
        {/* Row 1: tick | time | seq | type */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-fg-muted">t{envelope.tick}</span>
          <span className="mono text-fg-subtle">{formatTime(envelope.occurredAt)}</span>
          <span className="mono text-fg-muted">#{envelope.seq}</span>
          <span className="flex items-center gap-1">
            <Pill tone="accent">{prefix}</Pill>
            <span className="text-xs text-fg-default">{rest}</span>
          </span>
        </div>
        {/* Row 2: agent | node */}
        <div className="flex items-center gap-2 mt-0.5">
          {envelope.agent && (
            <span className="mono text-fg-muted">{envelope.agent.slice(0, 8)}</span>
          )}
          {envelope.node !== null && envelope.node !== undefined && (
            <span className="mono text-fg-muted">node:{envelope.node}</span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="surface-2 mx-3 mb-2 p-3 rounded">
          <JsonTree value={envelope.payload} initiallyOpen />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────

export function FeedReplayView() {
  // ── Form state ────────────────────────────────────────────
  const [form, setForm] = useState<RangeForm>({ from: '', to: '', agent: '', node: '' });
  const [activeTypePrefixes, setActiveTypePrefixes] = useState<Set<string>>(new Set());
  const [customPrefixes, setCustomPrefixes] = useState<string[]>([]);

  // ── Triggered fetch params (null = not yet fetched) ───────
  const [fetchParams, setFetchParams] = useState<FetchParams | null>(null);

  // ── Recent ranges ─────────────────────────────────────────
  const [recentRanges, setRecentRanges] = useState<RecentRange[]>([]);

  // ── Expanded rows ─────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Derived form validation ───────────────────────────────
  const fromNum = form.from !== '' ? Number(form.from) : NaN;
  const toNum = form.to !== '' ? Number(form.to) : NaN;
  const isValid =
    form.from !== '' &&
    form.to !== '' &&
    !isNaN(fromNum) &&
    !isNaN(toNum) &&
    fromNum >= 0 &&
    toNum >= 0 &&
    fromNum <= toNum;

  // ── Query ─────────────────────────────────────────────────
  const { data, isFetching, error } = useQuery({
    queryKey: [
      'feedRange',
      fetchParams?.from,
      fetchParams?.to,
      fetchParams?.type,
      fetchParams?.agent,
      fetchParams?.node,
    ],
    queryFn: () => {
      if (!fetchParams) return Promise.resolve<FeedEnvelope[]>([]);
      return fetchFeedRange({
        from: fetchParams.from,
        to: fetchParams.to,
        type: fetchParams.type.length > 0 ? fetchParams.type : undefined,
        agent: fetchParams.agent || undefined,
        node: fetchParams.node !== '' ? Number(fetchParams.node) : undefined,
      });
    },
    enabled: fetchParams !== null,
    staleTime: 0,
  });

  // ── Truncation detection ──────────────────────────────────
  const isTruncated =
    fetchParams !== null &&
    data !== undefined &&
    data.length > 0 &&
    data[0].seq > fetchParams.from;

  // ── Handlers ─────────────────────────────────────────────
  function handleFetch() {
    if (!isValid) return;
    const params: FetchParams = {
      from: fromNum,
      to: toNum,
      type: [...activeTypePrefixes],
      agent: form.agent.trim(),
      node: form.node,
    };
    setFetchParams(params);
    setExpandedIds(new Set());

    const label = `${fromNum}..${toNum}`;
    setRecentRanges((prev) => {
      const next = [{ from: fromNum, to: toNum, label }, ...prev.filter((r) => r.label !== label)];
      return next.slice(0, MAX_RECENT_RANGES);
    });
  }

  function handleClearResults() {
    setFetchParams(null);
    setExpandedIds(new Set());
  }

  function handlePickRecent(range: RecentRange) {
    setForm((f) => ({ ...f, from: String(range.from), to: String(range.to) }));
  }

  const toggleTypePrefix = useCallback((prefix: string) => {
    setActiveTypePrefixes((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const addCustomPrefix = useCallback((prefix: string) => {
    setCustomPrefixes((prev) => (prev.includes(prefix) ? prev : [...prev, prefix]));
    setActiveTypePrefixes((prev) => {
      const next = new Set(prev);
      next.add(prefix);
      return next;
    });
  }, []);

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────
  const hasResult = fetchParams !== null && !isFetching && !error;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar: form ────────────────────────────────── */}
      <div className="shrink-0 overflow-y-auto border-b border-border-subtle bg-bg-subtle">
        <div className="p-3">
          <Card>
            <CardSection title="Range">
              <div className="flex flex-col gap-4">
                {/* From / To seq inputs */}
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="label-muted" htmlFor="replay-from">From seq</label>
                    <Input
                      id="replay-from"
                      type="number"
                      mono
                      placeholder="0"
                      min={0}
                      value={form.from}
                      onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                      aria-label="From sequence number"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="label-muted" htmlFor="replay-to">To seq</label>
                    <Input
                      id="replay-to"
                      type="number"
                      mono
                      placeholder="1000"
                      min={0}
                      value={form.to}
                      onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                      aria-label="To sequence number"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleFetch}
                    disabled={!isValid || isFetching}
                    className="shrink-0"
                    aria-label="Fetch range"
                  >
                    {isFetching ? 'Loading…' : 'Fetch range'}
                  </Button>
                </div>

                {/* Validation hint */}
                {form.from !== '' && form.to !== '' && !isNaN(fromNum) && !isNaN(toNum) && fromNum > toNum && (
                  <p className="text-xs text-danger">From must be ≤ to.</p>
                )}

                {/* Type prefix chips */}
                <TypeChips
                  active={activeTypePrefixes}
                  customPrefixes={customPrefixes}
                  onToggle={toggleTypePrefix}
                  onAddCustom={addCustomPrefix}
                />

                {/* Agent + Node */}
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="label-muted" htmlFor="replay-agent">Agent UUID</label>
                    <Input
                      id="replay-agent"
                      mono
                      placeholder="optional uuid…"
                      value={form.agent}
                      onChange={(e) => setForm((f) => ({ ...f, agent: e.target.value }))}
                      aria-label="Agent UUID filter"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <label className="label-muted" htmlFor="replay-node">Node ID</label>
                    <Input
                      id="replay-node"
                      type="number"
                      mono
                      placeholder="optional…"
                      min={0}
                      value={form.node}
                      onChange={(e) => setForm((f) => ({ ...f, node: e.target.value }))}
                      aria-label="Node ID filter"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && <InlineError error={error} />}

                {/* Recent ranges */}
                {recentRanges.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="label-muted">Recent ranges</span>
                    <div className="flex flex-wrap gap-1">
                      {recentRanges.map((r) => (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() => handlePickRecent(r)}
                          className={cn(
                            'inline-flex items-center h-5 px-1.5 rounded-sm border text-2xs font-mono transition-colors duration-150',
                            'bg-bg-raised text-fg-muted border-border-default hover:text-fg-default hover:border-border-strong',
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardSection>
          </Card>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Results header */}
        {hasResult && data !== undefined && (
          <div className="shrink-0 h-9 flex items-center gap-2 px-3 border-b border-border-subtle bg-bg-base">
            <span className="text-xs font-medium text-fg-subtle">
              {data.length} event{data.length !== 1 ? 's' : ''} in [
              <span className="mono">{fetchParams.from}</span>..
              <span className="mono">{fetchParams.to}</span>]
            </span>
            {isTruncated && (
              <Pill tone="warning">truncated</Pill>
            )}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleClearResults}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Truncation notice */}
        {isTruncated && (
          <div className="shrink-0 px-3 py-2 border-b border-border-subtle bg-warning-subtle">
            <p className="text-xs text-warning">
              Earlier events have rolled off Redis (5 000-entry cap). Results start at seq{' '}
              <span className="mono">{data![0].seq}</span>.
            </p>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {fetchParams === null ? (
            <Empty
              title="Pick a range to replay"
              hint="Enter from / to seq above and click Fetch range."
              className="h-full"
            />
          ) : isFetching ? (
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-3 py-2 border-b border-border-subtle animate-pulse flex flex-col gap-1.5">
                  <div className="surface-2 h-3.5 rounded w-2/3" />
                  <div className="surface-2 h-3 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? null : data !== undefined && data.length === 0 ? (
            <Empty
              title="No events in range"
              hint="Earlier events may have rolled off Redis (5 000-entry cap)."
              className="h-full"
            />
          ) : data !== undefined && data.length > 0 ? (
            <div className="flex flex-col surface-1 m-3 overflow-hidden">
              {data.map((envelope) => (
                <EventRow
                  key={envelope.id}
                  envelope={envelope}
                  isExpanded={expandedIds.has(envelope.id)}
                  onToggle={() => toggleRow(envelope.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
