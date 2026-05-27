/**
 * NPC catalog mirrored from the backend's Phase 2 fauna config
 * (config/npcs.yaml on the server). Hardcoded so the zone editor can offer a
 * proper dropdown without an extra API round-trip. If the backend adds a
 * `/admin/catalogs/npcs` endpoint later, switch this to a fetched list.
 */

export type AggressionProfile = 'PASSIVE' | 'TERRITORIAL' | 'HOSTILE';

export interface NpcCatalogEntry {
  id: string;
  displayName: string;
  hpMax: number;
  damage: number;
  aggressionProfile: AggressionProfile;
  spawnBiomes: string[];
}

export const NPC_CATALOG: NpcCatalogEntry[] = [
  // Phase 2 Tier-A.
  { id: 'GRAY_WOLF',      displayName: 'Gray Wolf',       hpMax: 30, damage: 6,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['FOREST', 'TUNDRA'] },
  { id: 'WILD_BOAR',      displayName: 'Wild Boar',       hpMax: 40, damage: 8,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['FOREST', 'PLAINS', 'SWAMP'] },
  { id: 'DEER',           displayName: 'Deer',            hpMax: 20, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['FOREST', 'PLAINS'] },
  { id: 'GIANT_RAT',      displayName: 'Giant Rat',       hpMax: 12, damage: 3,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['SWAMP', 'COASTAL'] },

  // Mammals.
  { id: 'BROWN_BEAR',     displayName: 'Brown Bear',      hpMax: 60, damage: 12, aggressionProfile: 'TERRITORIAL', spawnBiomes: ['FOREST', 'MOUNTAIN'] },
  { id: 'ELK',            displayName: 'Elk',             hpMax: 35, damage: 7,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['FOREST', 'TUNDRA'] },
  { id: 'COUGAR',         displayName: 'Cougar',          hpMax: 40, damage: 9,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['MOUNTAIN', 'FOREST'] },
  { id: 'BLACK_PANTHER',  displayName: 'Black Panther',   hpMax: 35, damage: 10, aggressionProfile: 'TERRITORIAL', spawnBiomes: ['SWAMP', 'FOREST'] },
  { id: 'BISON',          displayName: 'Bison',           hpMax: 80, damage: 11, aggressionProfile: 'TERRITORIAL', spawnBiomes: ['PLAINS'] },
  { id: 'WILD_HORSE',     displayName: 'Wild Horse',      hpMax: 40, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['PLAINS', 'FOREST'] },
  { id: 'MOUNTAIN_GOAT',  displayName: 'Mountain Goat',   hpMax: 28, damage: 5,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['MOUNTAIN'] },
  { id: 'DESERT_JACKAL',  displayName: 'Desert Jackal',   hpMax: 22, damage: 5,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['DESERT'] },
  { id: 'RED_FOX',        displayName: 'Red Fox',         hpMax: 15, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['FOREST', 'PLAINS'] },
  { id: 'SNOW_HARE',      displayName: 'Snow Hare',       hpMax: 8,  damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['TUNDRA'] },
  { id: 'RIVER_OTTER',    displayName: 'River Otter',     hpMax: 12, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['COASTAL'] },
  { id: 'CAVE_BAT',       displayName: 'Cave Bat',        hpMax: 5,  damage: 2,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['MOUNTAIN'] },

  // Birds.
  { id: 'GIANT_OWL',      displayName: 'Giant Owl',       hpMax: 18, damage: 5,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['FOREST'] },
  { id: 'HAWK',           displayName: 'Hawk',            hpMax: 8,  damage: 4,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['MOUNTAIN', 'PLAINS'] },
  { id: 'VULTURE',        displayName: 'Vulture',         hpMax: 14, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['DESERT'] },
  { id: 'WILD_TURKEY',    displayName: 'Wild Turkey',     hpMax: 12, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['FOREST', 'PLAINS'] },
  { id: 'PHEASANT',       displayName: 'Pheasant',        hpMax: 6,  damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['PLAINS', 'FOREST'] },

  // Reptiles.
  { id: 'SWAMP_PYTHON',   displayName: 'Swamp Python',    hpMax: 25, damage: 8,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['SWAMP'] },
  { id: 'MONITOR_LIZARD', displayName: 'Monitor Lizard',  hpMax: 22, damage: 6,  aggressionProfile: 'TERRITORIAL', spawnBiomes: ['DESERT'] },
  { id: 'BOG_TURTLE',     displayName: 'Bog Turtle',      hpMax: 30, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['SWAMP'] },
  { id: 'SAND_VIPER',     displayName: 'Sand Viper',      hpMax: 10, damage: 4,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['DESERT'] },
  { id: 'CAVE_SALAMANDER',displayName: 'Cave Salamander', hpMax: 8,  damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['MOUNTAIN'] },

  // Arthropods.
  { id: 'GIANT_SPIDER',   displayName: 'Giant Spider',    hpMax: 15, damage: 5,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['FOREST', 'SWAMP'] },
  { id: 'SAND_SCORPION',  displayName: 'Sand Scorpion',   hpMax: 12, damage: 6,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['DESERT'] },
  { id: 'CENTIPEDE',      displayName: 'Centipede',       hpMax: 8,  damage: 3,  aggressionProfile: 'HOSTILE',     spawnBiomes: ['SWAMP', 'RUINS'] },
  { id: 'HIVE_BEE',       displayName: 'Hive Bee',        hpMax: 10, damage: 0,  aggressionProfile: 'PASSIVE',     spawnBiomes: ['FOREST', 'SWAMP'] },
];

const BY_ID: Map<string, NpcCatalogEntry> = new Map(NPC_CATALOG.map((e) => [e.id, e]));

export function npcLabel(id: string): string {
  return BY_ID.get(id)?.displayName ?? id;
}

export function npcEntry(id: string): NpcCatalogEntry | undefined {
  return BY_ID.get(id);
}

/** NPC types whose spawn-biomes intersect the given node biome. */
export function npcsForBiome(biome: string | null | undefined): NpcCatalogEntry[] {
  if (!biome) return NPC_CATALOG;
  return NPC_CATALOG.filter((e) => e.spawnBiomes.includes(biome));
}
