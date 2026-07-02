import type { RaceId } from '../types';

/**
 * Per-race accent color used for spawn markers in the 2D and 3D editors and
 * for swatches in the right-click starter context menu. Colors are picked to
 * read distinctly on top of any biome/terrain palette.
 */
export const raceColors: Record<RaceId, string> = {
  human_highland: '#5BA0E0',
  human_steppe: '#E0A24F',
  human_commoner: '#7DB04A',
};

const FALLBACK = '#cccccc';

export function raceColorFor(raceId: RaceId): string {
  return raceColors[raceId] ?? FALLBACK;
}
