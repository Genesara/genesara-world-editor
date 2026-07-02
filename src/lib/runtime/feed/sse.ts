import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source';
import { absoluteUrl, getBearer, notifyUnauthorized } from '../api/client';
import type { ConnectionState, FeedEnvelope, Seq } from '../types';

export interface FeedFilters {
  type?: string[];
  agent?: string;
  node?: number;
}

export interface FeedClientOptions {
  filters?: FeedFilters;
  startAfter?: Seq;
  onEvent: (env: FeedEnvelope) => void;
  onState: (s: ConnectionState) => void;
  /** Called when a 429 (concurrent connection cap) is detected. */
  onDegraded?: () => void;
}

export interface FeedClient {
  close: () => void;
}

const HEARTBEAT_TIMEOUT_MS = 60_000;

class FatalError extends Error {}

function buildQuery(filters: FeedFilters | undefined, after: Seq | undefined): string {
  const p = new URLSearchParams();
  if (after !== undefined) p.set('after', String(after));
  if (filters?.type?.length) p.set('type', filters.type.join(','));
  if (filters?.agent) p.set('agent', filters.agent);
  if (filters?.node !== undefined) p.set('node', String(filters.node));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export function openFeed(opts: FeedClientOptions): FeedClient {
  const ctrl = new AbortController();
  let lastSeq: Seq | undefined = opts.startAfter;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const setState = (s: ConnectionState) => {
    if (!closed) opts.onState(s);
  };

  const armWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      // No bytes in 60s -> kick the connection. fetch-event-source will retry.
      ctrl.abort();
    }, HEARTBEAT_TIMEOUT_MS);
  };

  const start = async () => {
    setState('connecting');
    try {
      await fetchEventSource(absoluteUrl(`/admin/feed${buildQuery(opts.filters, lastSeq)}`), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(getBearer() ? { Authorization: `Bearer ${getBearer()}` } : {}),
        },
        signal: ctrl.signal,
        openWhenHidden: true,
        async onopen(res) {
          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
            setState('live');
            armWatchdog();
            return;
          }
          if (res.status === 401 || res.status === 403) {
            notifyUnauthorized();
            throw new FatalError(`auth ${res.status}`);
          }
          if (res.status === 429) {
            setState('degraded');
            opts.onDegraded?.();
            throw new FatalError('429');
          }
          throw new Error(`bad status ${res.status}`);
        },
        onmessage(ev: EventSourceMessage) {
          armWatchdog();
          if (!ev.data) return; // heartbeat
          try {
            const env = JSON.parse(ev.data) as FeedEnvelope;
            lastSeq = env.seq;
            opts.onEvent(env);
          } catch {
            // ignore malformed frame
          }
        },
        onclose() {
          // server closed the stream cleanly; treat as reconnect
          if (!closed) {
            setState('reconnecting');
            throw new Error('stream closed');
          }
        },
        onerror(err) {
          if (err instanceof FatalError) throw err;
          if (!closed) setState('reconnecting');
          // returning undefined enables built-in retry with exponential backoff
          return 2000;
        },
      });
    } catch (e) {
      if (!closed) {
        if (e instanceof FatalError) {
          setState('disconnected');
        } else {
          setState('disconnected');
        }
      }
    }
  };

  void start();

  return {
    close() {
      closed = true;
      if (watchdog) clearTimeout(watchdog);
      ctrl.abort();
    },
  };
}
