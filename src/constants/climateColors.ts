import type { ClimateType } from '../types';

export type ClimateEffect =
  | 'SNOW_SHIMMER'
  | 'BLUE_GRAY_TINT'
  | 'EDGE_BRIGHTEN'
  | 'BLUE_PULSE'
  | 'WARM_TINT'
  | 'GOLDEN_TINT'
  | 'GREEN_SHIMMER'
  | 'GREEN_PULSE'
  | 'RIPPLE'
  | 'DESATURATE'
  | 'HEAT_SHIMMER'
  | 'VOLCANIC_GLOW'
  | 'SPARKLE';

export const climateColors: Record<ClimateType, string> = {
  ARCTIC: '#b3e5fc',
  SUBARCTIC: '#cfd8dc',
  HIGHLAND: '#eceff1',
  OCEANIC: '#81d4fa',
  CONTINENTAL: '#fff9c4',
  MEDITERRANEAN: '#ffe082',
  SUBTROPICAL: '#c8e6c9',
  TROPICAL: '#a5d6a7',
  MONSOON: '#90caf9',
  SEMI_ARID: '#ffe0b2',
  ARID: '#ffcc80',
  VOLCANIC: '#ef9a9a',
  MAGICAL: '#ce93d8',
};

export const climateEffect: Record<ClimateType, ClimateEffect> = {
  ARCTIC: 'SNOW_SHIMMER',
  SUBARCTIC: 'BLUE_GRAY_TINT',
  HIGHLAND: 'EDGE_BRIGHTEN',
  OCEANIC: 'BLUE_PULSE',
  CONTINENTAL: 'WARM_TINT',
  MEDITERRANEAN: 'GOLDEN_TINT',
  SUBTROPICAL: 'GREEN_SHIMMER',
  TROPICAL: 'GREEN_PULSE',
  MONSOON: 'RIPPLE',
  SEMI_ARID: 'DESATURATE',
  ARID: 'HEAT_SHIMMER',
  VOLCANIC: 'VOLCANIC_GLOW',
  MAGICAL: 'SPARKLE',
};

export const EMPTY_FACE_COLOR = '#2a2a2a';

export const climateColorFor = (c: ClimateType): string => climateColors[c];
export const effectFor = (c: ClimateType): ClimateEffect => climateEffect[c];
