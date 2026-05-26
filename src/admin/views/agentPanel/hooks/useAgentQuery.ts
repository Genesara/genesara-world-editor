import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/admin/lib/api/agents';
import type { AgentDetail } from '@/admin/lib/api/agents';
import type { Uuid } from '@/admin/lib/types';

export const agentKey = (id: Uuid) => ['agent', id] as const;
export const inventoryKey = (id: Uuid) => ['agent', id, 'inventory'] as const;

export function useAgentQuery(id: Uuid) {
  return useQuery({
    queryKey: agentKey(id),
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
    retry: (count, err) => {
      const status = (err as { status?: number }).status;
      if (status === 404) return false;
      return count < 2;
    },
  });
}

export function useInventoryQuery(id: Uuid) {
  return useQuery({
    queryKey: inventoryKey(id),
    queryFn: () => agentsApi.getInventory(id),
    enabled: !!id,
  });
}

export function useSetXp(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => agentsApi.setXp(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetLevel(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (level: number) => agentsApi.setLevel(id, level),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetAttributes(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AgentDetail['attributes']>) => agentsApi.setAttributes(id, body),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: agentKey(id) });
      const prev = qc.getQueryData<AgentDetail>(agentKey(id));
      if (prev) {
        qc.setQueryData<AgentDetail>(agentKey(id), {
          ...prev,
          attributes: { ...prev.attributes, ...patch },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(agentKey(id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetGauges(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AgentDetail['gauges']>) => agentsApi.setGauges(id, body),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: agentKey(id) });
      const prev = qc.getQueryData<AgentDetail>(agentKey(id));
      if (prev) {
        qc.setQueryData<AgentDetail>(agentKey(id), {
          ...prev,
          gauges: { ...prev.gauges, ...patch },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(agentKey(id), ctx.prev);
    },
    onSuccess: (res) => {
      const current = qc.getQueryData<AgentDetail>(agentKey(id));
      if (current && res) {
        qc.setQueryData<AgentDetail>(agentKey(id), {
          ...current,
          gauges: { ...current.gauges, ...res.applied },
        });
      }
    },
  });
}

export function useSetClass(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) => agentsApi.setClass(id, classId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useReopenClassOffers(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsApi.reopenClassOffers(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetSkill(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, body }: { skillId: string; body: { xp?: number; level?: number } }) =>
      agentsApi.setSkill(id, skillId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useDeleteSkill(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => agentsApi.deleteSkill(id, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useGrantPerk(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (perkId: string) => agentsApi.grantPerk(id, perkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useRevokePerk(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (perkId: string) => agentsApi.revokePerk(id, perkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useTeleport(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: number) => agentsApi.teleport(id, nodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetSafeNode(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: number) => agentsApi.setSafeNode(id, nodeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useRespawn(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsApi.respawn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function usePatchInventory(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, delta }: { itemId: string; delta: number }) =>
      agentsApi.patchInventory(id, itemId, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKey(id) }),
  });
}

export function useDeleteInventory(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => agentsApi.deleteInventory(id, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKey(id) }),
  });
}

export function useCreateEquipment(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { itemId: string; rarity?: string; durabilityCurrent?: number; creatorAgentId?: Uuid }) =>
      agentsApi.createEquipment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function usePatchEquipment(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instanceId,
      body,
    }: {
      instanceId: string;
      body: { rarity?: string; durabilityCurrent?: number; durabilityMax?: number };
    }) => agentsApi.patchEquipment(id, instanceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useDeleteEquipment(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => agentsApi.deleteEquipment(id, instanceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useEquip(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, slot }: { instanceId: string; slot?: string }) =>
      agentsApi.equip(id, instanceId, slot),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useUnequip(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => agentsApi.unequip(id, instanceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetAuthority(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { value?: number; delta?: number }) => agentsApi.setAuthority(id, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: agentKey(id) });
      const prev = qc.getQueryData<AgentDetail>(agentKey(id));
      if (prev?.social && body.value !== undefined) {
        qc.setQueryData<AgentDetail>(agentKey(id), {
          ...prev,
          social: { ...prev.social, authority: body.value },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(agentKey(id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetFame(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { value?: number; delta?: number }) => agentsApi.setFame(id, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: agentKey(id) });
      const prev = qc.getQueryData<AgentDetail>(agentKey(id));
      if (prev?.social && body.value !== undefined) {
        qc.setQueryData<AgentDetail>(agentKey(id), {
          ...prev,
          social: { ...prev.social, fame: body.value },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(agentKey(id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetOutlaw(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { state: string; expiresAtTick?: number }) => agentsApi.setOutlaw(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}

export function useSetRelationship(id: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      otherId,
      body,
    }: {
      otherId: Uuid;
      body: { value?: number; delta?: number };
    }) => agentsApi.setRelationship(id, otherId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKey(id) }),
  });
}
