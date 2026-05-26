import { api } from './client';
import type { AuditPage, Seq } from '../types';

export interface ListAuditOpts {
  after?: Seq;
  limit?: number;
}

export function listAudit(opts: ListAuditOpts = {}) {
  return api.get<AuditPage>('/admin/audit', {
    query: { after: opts.after ?? 0, limit: opts.limit ?? 100 },
  });
}
