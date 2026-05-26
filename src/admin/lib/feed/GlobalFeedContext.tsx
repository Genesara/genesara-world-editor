import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openFeed, type FeedFilters, type FeedClient } from './sse';
import type { ConnectionState, FeedEnvelope, Seq } from '../types';
import { useAuth } from '../auth/AuthContext';

const RING_SIZE = 2000;

interface GlobalFeedState {
  events: FeedEnvelope[];
  status: ConnectionState;
  lastSeq: Seq | undefined;
  filters: FeedFilters;
  setFilters: (f: FeedFilters) => void;
  clear: () => void;
}

const GlobalFeedContext = createContext<GlobalFeedState | null>(null);

export function GlobalFeedProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [events, setEvents] = useState<FeedEnvelope[]>([]);
  const [status, setStatus] = useState<ConnectionState>('idle');
  const [filters, setFiltersRaw] = useState<FeedFilters>({});
  const lastSeqRef = useRef<Seq | undefined>(undefined);
  const [lastSeqState, setLastSeqState] = useState<Seq | undefined>(undefined);
  const clientRef = useRef<FeedClient | null>(null);

  const setFilters = useCallback((f: FeedFilters) => {
    setFiltersRaw(f);
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      clientRef.current?.close();
      clientRef.current = null;
      setStatus('idle');
      return;
    }
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
    clientRef.current = client;
    return () => {
      client.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, filterKey]);

  const value = useMemo<GlobalFeedState>(
    () => ({ events, status, lastSeq: lastSeqState, filters, setFilters, clear }),
    [events, status, lastSeqState, filters, setFilters, clear],
  );

  return <GlobalFeedContext.Provider value={value}>{children}</GlobalFeedContext.Provider>;
}

export function useGlobalFeed(): GlobalFeedState {
  const ctx = useContext(GlobalFeedContext);
  if (!ctx) throw new Error('useGlobalFeed must be used inside <GlobalFeedProvider>');
  return ctx;
}
