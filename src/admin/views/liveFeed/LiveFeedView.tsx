import { useCallback, useEffect, useRef, useState } from 'react';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { useRecent } from '@/admin/lib/recent';
import type { FeedFilters } from '@/admin/lib/feed/sse';
import type { FeedEnvelope } from '@/admin/lib/types';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { Empty } from '@/admin/components/ui/Empty';
import { Pill } from '@/admin/components/ui/Pill';
import { JsonTree } from '@/admin/components/ui/JsonTree';
import { cn } from '@/admin/lib/cn';

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const DEFAULT_TYPE_PREFIXES = [
  'agent',
  'combat',
  'environment',
  'social',
  'economy',
] as const;

// ────────────────────────────────────────────────────────────
// Helper utilities
// ────────────────────────────────────────────────────────────

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

/** Split "agent.moved" into prefix="agent", rest=".moved" */
function splitEventType(type: string): { prefix: string; rest: string } {
  const dot = type.indexOf('.');
  if (dot === -1) return { prefix: type, rest: '' };
  return { prefix: type.slice(0, dot), rest: type.slice(dot) };
}

/** Best-effort one-liner summary from an unknown payload */
function payloadSummaryChips(payload: unknown): Array<{ key: string; value: string }> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  const p = payload as Record<string, unknown>;
  const interested = ['from', 'to', 'damage', 'item', 'amount', 'reason', 'state'];
  const chips: Array<{ key: string; value: string }> = [];
  for (const k of interested) {
    if (k in p && p[k] !== null && p[k] !== undefined) {
      const raw = p[k];
      const val = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      chips.push({ key: k, value: val.length > 20 ? val.slice(0, 20) + '…' : val });
      if (chips.length === 2) break;
    }
  }
  return chips;
}

// ────────────────────────────────────────────────────────────
// Filter rail sub-components
// ────────────────────────────────────────────────────────────

interface TypeFilterProps {
  active: Set<string>;
  onToggle: (prefix: string) => void;
  customPrefixes: string[];
  onAddCustom: (prefix: string) => void;
  onClear: () => void;
}

function TypeFilterSection({ active, onToggle, customPrefixes, onAddCustom, onClear }: TypeFilterProps) {
  const [draft, setDraft] = useState('');

  function handleAddKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const trimmed = draft.trim().toLowerCase();
      if (trimmed) {
        onAddCustom(trimmed);
        setDraft('');
      }
    }
  }

  const allPrefixes = [...DEFAULT_TYPE_PREFIXES, ...customPrefixes];
  const hasActive = active.size > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-muted">Event type</span>
        {hasActive && (
          <button
            type="button"
            onClick={onClear}
            className="text-2xs text-fg-muted hover:text-fg-default transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>
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
        placeholder="Add prefix…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleAddKey}
        className="h-7 text-xs"
      />
    </div>
  );
}

interface IdFilterProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  recents: string[];
  onPickRecent: (v: string) => void;
  inputType?: 'text' | 'number';
  placeholder: string;
  mono?: boolean;
}

function IdFilterSection({
  label,
  value,
  onChange,
  onClear,
  recents,
  onPickRecent,
  inputType = 'text',
  placeholder,
  mono,
}: IdFilterProps) {
  const hasValue = value !== '';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-muted">{label}</span>
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="text-2xs text-fg-muted hover:text-fg-default transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>
      <Input
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        mono={mono}
        className="h-7 text-xs"
      />
      {recents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recents.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onPickRecent(r)}
              className={cn(
                'inline-flex items-center h-5 px-1.5 rounded-sm border text-2xs font-mono transition-colors duration-150',
                value === String(r)
                  ? 'bg-accent-subtle text-accent border-accent/40'
                  : 'bg-bg-raised text-fg-muted border-border-default hover:text-fg-default hover:border-border-strong',
              )}
            >
              {typeof r === 'number' ? r : (r as string).slice(0, 8)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Event row
// ────────────────────────────────────────────────────────────

interface EventRowProps {
  envelope: FeedEnvelope;
  isExpanded: boolean;
  onToggle: () => void;
}

function EventRow({ envelope, isExpanded, onToggle }: EventRowProps) {
  const { prefix, rest } = splitEventType(envelope.type);
  const chips = payloadSummaryChips(envelope.payload);

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-1.5 hover:bg-bg-raised transition-colors duration-150 group"
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
        {/* Row 2: agent | node | payload chips */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {envelope.agent && (
            <span className="mono text-fg-muted">{envelope.agent.slice(0, 8)}</span>
          )}
          {envelope.node !== null && envelope.node !== undefined && (
            <span className="mono text-fg-muted">node:{envelope.node}</span>
          )}
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-0.5 h-4 px-1 rounded border border-border-default bg-bg-raised text-2xs font-mono text-fg-subtle"
            >
              <span className="text-fg-muted">{c.key}=</span>
              {c.value}
            </span>
          ))}
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

// ────────────────────────────────────────────────────────────
// Main view
// ────────────────────────────────────────────────────────────

export function LiveFeedView() {
  const { events, lastSeq, setFilters, clear } = useGlobalFeed();
  const { agents: recentAgents, nodes: recentNodes, pushAgent, pushNode } = useRecent();

  // ── Filter local state ────────────────────────────────────
  const [activeTypePrefixes, setActiveTypePrefixes] = useState<Set<string>>(new Set());
  const [customPrefixes, setCustomPrefixes] = useState<string[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [nodeInput, setNodeInput] = useState('');

  // ── Follow / autoscroll ───────────────────────────────────
  const [follow, setFollow] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Expanded rows ─────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Debounced filter apply ────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleApplyFilters = useCallback(
    (prefixes: Set<string>, agent: string, node: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next: FeedFilters = {};
        if (prefixes.size > 0) next.type = [...prefixes];
        const trimmedAgent = agent.trim();
        if (trimmedAgent) {
          next.agent = trimmedAgent;
          pushAgent(trimmedAgent);
        }
        const nodeNum = node !== '' ? Number(node) : NaN;
        if (!isNaN(nodeNum)) {
          next.node = nodeNum;
          pushNode(nodeNum);
        }
        setFilters(next);
      }, 250);
    },
    [setFilters, pushAgent, pushNode],
  );

  // Re-apply whenever filter inputs change
  useEffect(() => {
    scheduleApplyFilters(activeTypePrefixes, agentInput, nodeInput);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeTypePrefixes, agentInput, nodeInput, scheduleApplyFilters]);

  // ── Autoscroll ────────────────────────────────────────────
  useEffect(() => {
    if (!follow) return;
    const el = logRef.current;
    if (!el) return;
    // Use requestAnimationFrame so the DOM is painted before we scroll
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [events, follow]);

  function handleScroll() {
    const el = logRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Only disable follow if user genuinely scrolled away (> 80px)
    if (distFromBottom > 80) {
      setFollow(false);
    }
  }

  function handleFollowToggle() {
    setFollow(true);
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Type filter handlers ──────────────────────────────────
  function toggleTypePrefix(prefix: string) {
    setActiveTypePrefixes((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }

  function addCustomPrefix(prefix: string) {
    setCustomPrefixes((prev) => (prev.includes(prefix) ? prev : [...prev, prefix]));
    setActiveTypePrefixes((prev) => {
      const next = new Set(prev);
      next.add(prefix);
      return next;
    });
  }

  function clearTypeFilter() {
    setActiveTypePrefixes(new Set());
  }

  // ── Row toggle ────────────────────────────────────────────
  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────
  const ringSize = 2000;
  const visibleCount = events.length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: filter rail ─────────────────────────────── */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r border-border-subtle bg-bg-subtle overflow-y-auto">
        <div className="px-3 h-9 flex items-center border-b border-border-subtle shrink-0">
          <span className="label-muted">Filters</span>
        </div>

        <div className="flex flex-col gap-5 p-3 flex-1">
          <TypeFilterSection
            active={activeTypePrefixes}
            onToggle={toggleTypePrefix}
            customPrefixes={customPrefixes}
            onAddCustom={addCustomPrefix}
            onClear={clearTypeFilter}
          />

          <div className="border-t border-border-subtle" />

          <IdFilterSection
            label="Agent"
            value={agentInput}
            onChange={setAgentInput}
            onClear={() => setAgentInput('')}
            recents={recentAgents}
            onPickRecent={(v) => setAgentInput(v)}
            placeholder="agent uuid…"
            mono
          />

          <div className="border-t border-border-subtle" />

          <IdFilterSection
            label="Node"
            value={nodeInput}
            onChange={setNodeInput}
            onClear={() => setNodeInput('')}
            recents={recentNodes.map(String)}
            onPickRecent={(v) => setNodeInput(v)}
            inputType="number"
            placeholder="node id…"
          />
        </div>

        {/* Rail footer */}
        <div className="px-3 py-2 border-t border-border-subtle shrink-0 flex items-center justify-between gap-2">
          <span className="text-2xs text-fg-muted mono">
            {visibleCount} / {ringSize}
          </span>
          <Button variant="ghost" size="sm" onClick={clear} className="text-2xs h-6 px-2">
            Clear log
          </Button>
        </div>
      </aside>

      {/* ── Right: event log ──────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Log header bar */}
        <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-border-subtle bg-bg-base">
          <span className="text-xs font-medium text-fg-subtle">Live feed</span>
          <div className="flex items-center gap-3">
            {lastSeq !== undefined && (
              <span className="mono text-fg-muted">seq {lastSeq}</span>
            )}
            <button type="button" onClick={follow ? undefined : handleFollowToggle}>
              <Pill
                tone={follow ? 'success' : 'neutral'}
                className={cn('cursor-pointer select-none', !follow && 'hover:border-border-strong')}
              >
                {follow ? (
                  <>
                    <span className="size-1.5 rounded-full bg-success animate-pulse inline-block" />
                    following
                  </>
                ) : (
                  'paused — click to follow'
                )}
              </Pill>
            </button>
          </div>
        </div>

        {/* Scrollable event list */}
        <div
          ref={logRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {events.length === 0 ? (
            <Empty
              title="No events yet"
              hint="Filtered events will appear here in real time."
              className="h-full"
            />
          ) : (
            <div className="flex flex-col">
              {events.map((env) => (
                <EventRow
                  key={env.id}
                  envelope={env}
                  isExpanded={expandedIds.has(env.id)}
                  onToggle={() => toggleRow(env.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
