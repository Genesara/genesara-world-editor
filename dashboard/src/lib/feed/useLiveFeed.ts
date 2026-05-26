import { useEffect, useRef, useState } from 'react';
import { openFeed, type FeedFilters } from './sse';
import type { ConnectionState, FeedEnvelope, Seq } from '../types';

const RING_SIZE = 1000;

export interface UseLiveFeedResult {
  events: FeedEnvelope[];
  status: ConnectionState;
  /** Last seq seen — useful for resume across remounts. */
  lastSeq: Seq | undefined;
  /** Clear the local ring buffer (does not affect server replay). */
  clear: () => void;
}

export function useLiveFeed(filters: FeedFilters | undefined, startAfter?: Seq): UseLiveFeedResult {
  const [events, setEvents] = useState<FeedEnvelope[]>([]);
  const [status, setStatus] = useState<ConnectionState>('idle');
  const lastSeqRef = useRef<Seq | undefined>(startAfter);
  const [lastSeqState, setLastSeqState] = useState<Seq | undefined>(startAfter);

  const filterKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    const client = openFeed({
      filters,
      startAfter: lastSeqRef.current,
      onEvent: (env) => {
        lastSeqRef.current = env.seq;
        setLastSeqState(env.seq);
        setEvents((prev) => {
          const next = prev.length >= RING_SIZE ? prev.slice(prev.length - RING_SIZE + 1) : prev;
          return [...next, env];
        });
      },
      onState: setStatus,
    });
    return () => client.close();
    // re-open when filter selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return {
    events,
    status,
    lastSeq: lastSeqState,
    clear: () => setEvents([]),
  };
}
