import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAudit } from '@/admin/lib/api/audit';
import type { AuditEntry } from '@/admin/lib/types';
import { ApiError } from '@/admin/lib/api/error';
import styles from './AuditDrawer.module.css';

interface Props {
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(11, 19) + 'Z';
  } catch {
    return '—';
  }
}

export function AuditDrawer({ onClose }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return listAudit({ limit: 100 })
      .then((page) => setEntries(page.entries))
      .catch((e) => {
        setError(
          e instanceof ApiError
            ? e.detail ?? e.title
            : e instanceof Error
              ? e.message
              : 'Failed to load audit',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const trimmed = filter.trim();
    const list = trimmed ? entries.filter((e) => e.action.startsWith(trimmed)) : entries;
    return [...list].reverse(); // newest first
  }, [entries, filter]);

  const toggleRow = useCallback((seq: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  }, []);

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <aside className={styles.panel} role="dialog" aria-label="Audit log">
        <div className={styles.header}>
          <span className={styles.title}>Audit</span>
          <span className={styles.count}>{filtered.length}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="filter action prefix…"
            className={styles.input}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter audit by action prefix"
          />
          <button
            type="button"
            className={styles.refresh}
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.list}>
          {!error && filtered.length === 0 && !loading && (
            <div className={styles.empty}>No audit entries yet.</div>
          )}
          {filtered.map((e) => {
            const isOpen = expanded.has(e.seq);
            return (
              <div
                key={e.seq}
                className={styles.row}
                onClick={() => toggleRow(e.seq)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    toggleRow(e.seq);
                  }
                }}
              >
                <div className={styles.rowMeta}>
                  <span>#{e.seq}</span>
                  <span>tick {e.tick}</span>
                  <span>{formatTime(e.occurredAt)}</span>
                  <span>{e.adminId.slice(0, 8)}</span>
                </div>
                <div className={styles.rowAction}>
                  <span className={styles.actionPill}>{e.action}</span>
                  <span className={styles.target}>
                    {e.target}:{e.targetId.slice(0, 8)}
                  </span>
                </div>
                {isOpen && (
                  <pre className={styles.expanded}>{JSON.stringify(e.payload, null, 2)}</pre>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
