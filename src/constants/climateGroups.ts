import type { ClimateType } from '../types';

export interface ClimateGroup {
  label: string;
  climates: ClimateType[];
}

export const climateGroups: ClimateGroup[] = [
  { label: 'Cold', climates: ['ARCTIC', 'SUBARCTIC', 'HIGHLAND'] },
  { label: 'Temperate', climates: ['OCEANIC', 'CONTINENTAL', 'MEDITERRANEAN'] },
  { label: 'Warm', climates: ['SUBTROPICAL', 'TROPICAL', 'MONSOON'] },
  { label: 'Dry', climates: ['SEMI_ARID', 'ARID'] },
  { label: 'Exotic', climates: ['VOLCANIC', 'MAGICAL'] },
];

export const allClimates: ClimateType[] = climateGroups.flatMap((g) => g.climates);

export const climateLabel = (c: ClimateType): string =>
  c.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (m) => m.toUpperCase());
