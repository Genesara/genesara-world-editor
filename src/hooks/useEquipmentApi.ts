import { useCallback, useState } from 'react';
import type { EquipmentInstance, Rarity } from '../types';
import { authFetch } from '../utils/api';
import { getApiBaseUrlOrThrow } from '../utils/apiConfig';

export interface SeedEquipmentInput {
  itemId: string;
  rarity?: Rarity;
  durabilityCurrent?: number;
  creatorAgentId?: string | null;
}

export interface EquipmentApi {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  seed: (agentId: string, input: SeedEquipmentInput) => Promise<EquipmentInstance>;
}

export function useEquipmentApi(): EquipmentApi {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const seed = useCallback(
    async (agentId: string, input: SeedEquipmentInput): Promise<EquipmentInstance> => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `${getApiBaseUrlOrThrow()}/admin/agents/${encodeURIComponent(agentId)}/equipment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
        );
        if (!res.ok) {
          // Try to surface the ProblemDetail.detail when present.
          let detail = `${res.status} ${res.statusText}`;
          try {
            const body = (await res.json()) as { detail?: string };
            if (body && typeof body.detail === 'string' && body.detail.length > 0) {
              detail = body.detail;
            }
          } catch {
            /* keep default */
          }
          throw new Error(`Seed equipment failed: ${detail}`);
        }
        return (await res.json()) as EquipmentInstance;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error seeding equipment';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, clearError, seed };
}
