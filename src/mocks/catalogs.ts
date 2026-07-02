import type { ItemCatalogEntry } from '../types';
import {
  getItemCatalog,
  getRegisteredAgents,
  saveItemCatalog,
  saveRegisteredAgents,
} from './storage';

const DEFAULT_ITEMS: ItemCatalogEntry[] = [
  { itemId: 'RUSTY_SWORD', category: 'EQUIPMENT', maxDurability: 50, defaultRarity: 'COMMON' },
  { itemId: 'IRON_AXE', category: 'EQUIPMENT', maxDurability: 80, defaultRarity: 'UNCOMMON' },
  { itemId: 'OAK_BOW', category: 'EQUIPMENT', maxDurability: 60, defaultRarity: 'COMMON' },
  { itemId: 'HEALING_POTION', category: 'CONSUMABLE', maxDurability: null, defaultRarity: 'COMMON' },
];

// Stable hard-coded UUIDs so the UI can show pickers and tests are reproducible.
const DEFAULT_AGENTS: string[] = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];

export function bootstrapItemCatalog(): void {
  if (getItemCatalog().length > 0) return;
  saveItemCatalog(DEFAULT_ITEMS);
}

export function bootstrapAgentRegistry(): void {
  if (getRegisteredAgents().length > 0) return;
  saveRegisteredAgents(DEFAULT_AGENTS);
}

export function bootstrapMockCatalogs(): void {
  bootstrapItemCatalog();
  bootstrapAgentRegistry();
}
