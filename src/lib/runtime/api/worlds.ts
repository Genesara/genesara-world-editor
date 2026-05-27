import { api } from './client';
import type { NodeId, Uuid, WorldId } from '../types';

export interface BuildingInstance {
  instanceId: string;
  nodeId: NodeId;
  type: string;
  status: string;
  progressSteps: number;
  totalSteps: number;
  hpCurrent: number;
  hpMax: number;
  builtByAgentId?: Uuid;
}

export interface ChestContents {
  entries: Array<{ itemId: string; quantity: number }>;
}

export interface NpcInstance {
  npcId: string;
  nodeId: NodeId;
  spawnNodeId: NodeId;
  type: string;
  hp: number;
  hpMax: number;
}

export interface NpcZone {
  zoneId: string;
  scope: 'REGION' | 'NODE';
  regionId?: number;
  nodeId?: NodeId;
  weights: Record<string, number>;
  maxConcurrent: number;
  respawnTicks?: number;
  active: boolean;
}

export interface CreateBuildingBody {
  type: string;
  status?: string;
  progressSteps?: number;
  totalSteps?: number;
  hpCurrent?: number;
  hpMax?: number;
  builtByAgentId?: Uuid;
}

export interface PatchBuildingBody {
  hpCurrent?: number | null;
  hpMax?: number | null;
  progressSteps?: number | null;
  status?: string | null;
  builtByAgentId?: Uuid | null;
}

export const worldsApi = {
  listBuildings: (worldId: WorldId, nodeId: NodeId) =>
    api.get<BuildingInstance[]>(`/admin/worlds/${worldId}/nodes/${nodeId}/buildings`),
  createBuilding: (worldId: WorldId, nodeId: NodeId, body: CreateBuildingBody) =>
    api.post<BuildingInstance>(`/admin/worlds/${worldId}/nodes/${nodeId}/buildings`, body),
  patchBuilding: (worldId: WorldId, instanceId: string, body: PatchBuildingBody) =>
    api.patch<BuildingInstance>(`/admin/worlds/${worldId}/buildings/${instanceId}`, body),
  deleteBuilding: (worldId: WorldId, instanceId: string) =>
    api.delete(`/admin/worlds/${worldId}/buildings/${instanceId}`),

  getChest: (worldId: WorldId, instanceId: string) =>
    api.get<ChestContents>(`/admin/worlds/${worldId}/buildings/${instanceId}/chest`),
  putChest: (worldId: WorldId, instanceId: string, body: ChestContents) =>
    api.put<ChestContents>(`/admin/worlds/${worldId}/buildings/${instanceId}/chest`, body),
  patchChest: (worldId: WorldId, instanceId: string, body: { itemId: string; delta: number }) =>
    api.patch(`/admin/worlds/${worldId}/buildings/${instanceId}/chest`, body),
  deleteChestItem: (worldId: WorldId, instanceId: string, itemId: string) =>
    api.delete(`/admin/worlds/${worldId}/buildings/${instanceId}/chest/${encodeURIComponent(itemId)}`),

  listNpcsAtNode: (worldId: WorldId, nodeId: NodeId) =>
    api.get<NpcInstance[]>(`/admin/worlds/${worldId}/nodes/${nodeId}/npcs`),
  spawnNpc: (worldId: WorldId, nodeId: NodeId, body: { type: string; hp?: number }) =>
    api.post<NpcInstance>(`/admin/worlds/${worldId}/nodes/${nodeId}/npcs`, body),
  patchNpc: (worldId: WorldId, npcId: string, body: { hp?: number; nodeId?: NodeId }) =>
    api.patch<NpcInstance>(`/admin/worlds/${worldId}/npcs/${npcId}`, body),
  deleteNpc: (worldId: WorldId, npcId: string, silent = false) =>
    api.delete(`/admin/worlds/${worldId}/npcs/${npcId}${silent ? '?silent=true' : ''}`),

  listNpcZones: (worldId: WorldId) =>
    api.get<NpcZone[]>(`/admin/worlds/${worldId}/npc-zones`),
  createNpcZone: (worldId: WorldId, body: Omit<NpcZone, 'zoneId'>) =>
    api.post<NpcZone>(`/admin/worlds/${worldId}/npc-zones`, body),
  patchNpcZone: (worldId: WorldId, zoneId: string, body: Partial<NpcZone>) =>
    api.patch<NpcZone>(`/admin/worlds/${worldId}/npc-zones/${zoneId}`, body),
  deleteNpcZone: (worldId: WorldId, zoneId: string) =>
    api.delete(`/admin/worlds/${worldId}/npc-zones/${zoneId}`),
};
