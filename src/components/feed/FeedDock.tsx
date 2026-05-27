import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalFeed } from '@/admin/lib/feed/GlobalFeedContext';
import { fetchFeedRange } from '@/admin/lib/api/feed';
import type { FeedEnvelope, Seq } from '@/admin/lib/types';
import styles from './FeedDock.module.css';

type Mode = 'live' | 'replay';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional scope: when set, only events matching node are shown by default. */
  nodeScope?: number;
  /** Optional scope: when set, only events for this agent. */
  agentScope?: string;
  /** Distance (in px) from the top of the positioning parent. Lets the dock
   *  sit below a screen's header bar instead of covering it. */
  topOffset?: number;
}

const TYPE_PREFIXES = ['agent', 'combat', 'social', 'environment', 'economy'] as const;

function formatTime(iso: string | undefined): string {
  if (!iso) return '--:--:--';
  try {
    const d = new Date(iso);
    return d.toISOString().slice(11, 19);
  } catch {
    return '--:--:--';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'connecting':
      return 'Connecting';
    case 'reconnecting':
      return 'Reconnecting';
    case 'degraded':
      return 'Throttled';
    case 'disconnected':
      return 'Offline';
    default:
      return 'Idle';
  }
}

function statusDotClass(status: string): string {
  if (status === 'live') return styles.statusDotLive;
  if (status === 'reconnecting' || status === 'connecting') return styles.statusDotReconnect;
  if (status === 'disconnected' || status === 'degraded') return styles.statusDotError;
  return '';
}

export function FeedDock({ open, onOpenChange, nodeScope, agentScope, topOffset = 0 }: Props) {
  const { events, status, setFilters } = useGlobalFeed();
  const [mode, setMode] = useState<Mode>('live');
  const [activePrefixes, setActivePrefixes] = useState<Set<string>>(new Set());
  const [follow, setFollow] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [replay, setReplay] = useState<FeedEnvelope[] | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Push scope into the global feed filter so the SSE stream is narrowed too.
  useEffect(() => {
    const next: { type?: string[]; agent?: string; node?: number } = {};
    if (activePrefixes.size > 0) next.type = [...activePrefixes];
    if (agentScope) next.agent = agentScope;
    if (nodeScope != null) next.node = nodeScope;
    setFilters(next);
  }, [activePrefixes, agentScope, nodeScope, setFilters]);

  // Autoscroll when new events arrive in follow mode.
  useEffect(() => {
    if (mode !== 'live' || !follow) return;
    const el = listRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [events, follow, mode]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom > 80) setFollow(false);
  }, []);

  const togglePrefix = useCallback((p: string) => {
    setActivePrefixes((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const toggleRow = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runReplay = useCallback(async () => {
    const f = Number(from);
    const t = Number(to);
    if (!Number.isFinite(f) || !Number.isFinite(t) || f > t) {
      setReplayError('Invalid range');
      return;
    }
    setReplayLoading(true);
    setReplayError(null);
    try {
      const result = await fetchFeedRange({
        from: f as Seq,
        to: t as Seq,
        type: activePrefixes.size > 0 ? [...activePrefixes] : undefined,
        agent: agentScope,
        node: nodeScope,
      });
      setReplay(result);
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : 'Replay failed');
    } finally {
      setReplayLoading(false);
    }
  }, [from, to, activePrefixes, agentScope, nodeScope]);

  const shown = useMemo(() => {
    if (mode === 'replay' && replay) return replay;
    return events;
  }, [mode, replay, events]);

  if (!open) {
    return (
      <button
        type="button"
        className={styles.handle}
        onClick={() => onOpenChange(true)}
        title="Open live feed"
        aria-label="Open live feed"
        style={topOffset ? { top: `calc(50% + ${topOffset / 2}px)` } : undefined}
      >
        FEED
      </button>
    );
  }

  return (
    <aside
      className={styles.dock}
      role="complementary"
      aria-label="Live feed"
      style={topOffset ? { top: topOffset } : undefined}
    >
      <div className={styles.header}>
        <div className={styles.modeSwitch} role="tablist">
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'live' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('live')}
            role="tab"
            aria-selected={mode === 'live'}
          >
            Live
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'replay' ? styles.modeBtnActive : ''}`}
            onClick={() => setMode('replay')}
            role="tab"
            aria-selected={mode === 'replay'}
          >
            Replay
          </button>
        </div>
        {mode === 'live' && (
          <span className={styles.statusPill}>
            <span className={`${styles.statusDot} ${statusDotClass(status)}`} />
            {statusLabel(status)}
          </span>
        )}
        <div className={styles.headerSpacer} />
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => onOpenChange(false)}
          title="Collapse"
          aria-label="Collapse feed"
        >
          ×
        </button>
      </div>

      <div className={styles.filterBar}>
        {TYPE_PREFIXES.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.chip} ${activePrefixes.has(p) ? styles.chipActive : ''}`}
            onClick={() => togglePrefix(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {mode === 'replay' && (
        <div className={styles.replayBar}>
          <div className={styles.replayRow}>
            <input
              type="number"
              inputMode="numeric"
              placeholder="from seq"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={styles.replayInput}
              aria-label="From sequence"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="to seq"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={styles.replayInput}
              aria-label="To sequence"
            />
            <button
              type="button"
              className={styles.replayBtn}
              onClick={runReplay}
              disabled={replayLoading || !from || !to}
            >
              {replayLoading ? '…' : 'Fetch'}
            </button>
          </div>
          {replayError && (
            <div style={{ color: 'var(--hostile)', fontFamily: 'var(--mono)', fontSize: 11 }}>
              {replayError}
            </div>
          )}
        </div>
      )}

      <div className={styles.list} ref={listRef} onScroll={handleScroll}>
        {shown.length === 0 ? (
          <div className={styles.empty}>
            {mode === 'live' ? 'Waiting for events…' : 'No range fetched yet.'}
          </div>
        ) : (
          shown.map((env) => {
            const isOpen = expanded.has(env.id);
            return (
              <div
                key={env.id}
                className={styles.row}
                onClick={() => toggleRow(env.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(env.id);
                  }
                }}
              >
                <div className={styles.rowMeta}>
                  <span>t{env.tick}</span>
                  <span>{formatTime(env.occurredAt)}</span>
                  <span className={styles.rowSeq}>#{env.seq}</span>
                  <span className={styles.rowType}>{env.type}</span>
                </div>
                <div className={styles.rowSub}>
                  {env.agent && <span>agent {env.agent.slice(0, 8)} </span>}
                  {env.node != null && <span>· node {env.node}</span>}
                </div>
                {isOpen && (
                  <pre className={styles.rowExpanded}>
                    {JSON.stringify(env.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className={styles.footer}>
        <span>{shown.length} events</span>
        {mode === 'live' && (
          <button
            type="button"
            className={`${styles.followBtn} ${follow ? styles.followActive : ''}`}
            onClick={() => {
              const next = !follow;
              setFollow(next);
              if (next) {
                const el = listRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }
            }}
          >
            {follow ? '● following' : 'paused'}
          </button>
        )}
      </div>
    </aside>
  );
}
