import { api } from './client';
import type { FeedEnvelope, Seq } from '../types';

export interface FeedRangeOpts {
  from: Seq;
  to: Seq;
  type?: string[];
  agent?: string;
  node?: number;
}

export function fetchFeedRange(opts: FeedRangeOpts) {
  return api.get<FeedEnvelope[]>('/admin/feed/range', {
    query: {
      from: opts.from,
      to: opts.to,
      type: opts.type?.join(',') || undefined,
      agent: opts.agent || undefined,
      node: opts.node ?? undefined,
    },
  });
}
