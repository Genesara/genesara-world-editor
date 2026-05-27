import { api } from './client';
import type { Uuid, NodeId } from '../types';

export interface AgentDetail {
  id: Uuid;
  name?: string;
  raceId?: string;
  classId?: string;
  level: number;
  xp: number;
  attributes: {
    str: number;
    dex: number;
    con: number;
    per: number;
    int: number;
    luck: number;
    unspent: number;
  };
  gauges: {
    hp: number;
    hpMax: number;
    stamina: number;
    staminaMax: number;
    mana: number;
    manaMax: number;
    hunger: number;
    thirst: number;
    sleep: number;
  };
  nodeId?: NodeId;
  safeNodeId?: NodeId;
  skills: AgentSkill[];
  perks: AgentPerk[];
  equipped: EquippedItem[];
  social?: AgentSocial;
}

export interface AgentSkill {
  skillId: string;
  level: number;
  xp: number;
}

export interface AgentPerk {
  perkId: string;
}

export interface EquippedItem {
  instanceId: string;
  itemId: string;
  slot: string;
  rarity: string;
  durabilityCurrent: number;
  durabilityMax: number;
}

export interface AgentSocial {
  authority: number;
  fame: number;
  outlawState: string;
  outlawExpiresAtTick?: number;
  relationships: Array<{ otherId: Uuid; score: number }>;
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface ApplyResponse<T> {
  applied: T;
}

export interface TeleportResponse {
  from: NodeId | null;
  to: NodeId;
  crossedWorld: boolean;
}

const base = (id: Uuid) => `/admin/agents/${id}`;

export const agentsApi = {
  get: (id: Uuid) => api.get<AgentDetail>(base(id)),
  setXp: (id: Uuid, amount: number) => api.post(`${base(id)}/xp`, { amount }),
  setLevel: (id: Uuid, level: number) => api.post(`${base(id)}/level`, { level }),
  setAttributes: (id: Uuid, body: Partial<AgentDetail['attributes']>) => api.post(`${base(id)}/attributes`, body),
  setSkill: (id: Uuid, skillId: string, body: { xp?: number; level?: number }) =>
    api.post(`${base(id)}/skills/${skillId}`, body),
  deleteSkill: (id: Uuid, skillId: string) =>
    api.delete<{ warning?: string }>(`${base(id)}/skills/${skillId}`),
  grantPerk: (id: Uuid, perkId: string) => api.post(`${base(id)}/perks/${perkId}`),
  revokePerk: (id: Uuid, perkId: string) => api.delete(`${base(id)}/perks/${perkId}`),
  setClass: (id: Uuid, classId: string) => api.post(`${base(id)}/class`, { classId }),
  reopenClassOffers: (id: Uuid) => api.post(`${base(id)}/class/offers`),
  setGauges: (id: Uuid, body: Partial<AgentDetail['gauges']>) =>
    api.post<ApplyResponse<Partial<AgentDetail['gauges']>>>(`${base(id)}/gauges`, body),
  teleport: (id: Uuid, nodeId: NodeId) =>
    api.post<TeleportResponse>(`${base(id)}/position`, { nodeId }),
  setSafeNode: (id: Uuid, nodeId: NodeId) => api.post(`${base(id)}/safe-node`, { nodeId }),
  respawn: (id: Uuid) => api.post(`${base(id)}/respawn`),

  getInventory: (id: Uuid) => api.get<InventoryEntry[]>(`${base(id)}/inventory`),
  patchInventory: (id: Uuid, itemId: string, delta: number) =>
    api.post(`${base(id)}/inventory`, { itemId, delta }),
  deleteInventory: (id: Uuid, itemId: string) =>
    api.delete(`${base(id)}/inventory/${encodeURIComponent(itemId)}`),

  createEquipment: (
    id: Uuid,
    body: { itemId: string; rarity?: string; durabilityCurrent?: number; creatorAgentId?: Uuid },
  ) => api.post<{ instanceId: string }>(`${base(id)}/equipment`, body),
  patchEquipment: (
    id: Uuid,
    instanceId: string,
    body: { rarity?: string; durabilityCurrent?: number; durabilityMax?: number },
  ) => api.patch(`${base(id)}/equipment/${instanceId}`, body),
  deleteEquipment: (id: Uuid, instanceId: string) =>
    api.delete(`${base(id)}/equipment/${instanceId}`),
  equip: (id: Uuid, instanceId: string, slot?: string) =>
    api.post(`${base(id)}/equipment/${instanceId}/equip`, slot ? { slot } : undefined),
  unequip: (id: Uuid, instanceId: string) =>
    api.delete(`${base(id)}/equipment/${instanceId}/equip`),

  setAuthority: (id: Uuid, body: { value?: number; delta?: number }) =>
    api.post(`${base(id)}/authority`, body),
  setFame: (id: Uuid, body: { value?: number; delta?: number }) =>
    api.post(`${base(id)}/fame`, body),
  setOutlaw: (id: Uuid, body: { state: string; expiresAtTick?: number }) =>
    api.post(`${base(id)}/outlaw`, body),
  setRelationship: (id: Uuid, otherId: Uuid, body: { value?: number; delta?: number }) =>
    api.post(`${base(id)}/relationships/${otherId}`, body),
};
