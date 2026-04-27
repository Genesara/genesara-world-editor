import type { TerrainType } from '../types';
import { terrainLabel } from '../constants/terrainGroups';
import styles from './StatusBar.module.css';

interface Props {
  hover: { q: number; r: number; terrain: TerrainType | null } | null;
  zoom: number;
  nodeCount: number;
  dirtyCount: number;
}

export function StatusBar({ hover, zoom, nodeCount, dirtyCount }: Props) {
  return (
    <footer className={styles.root}>
      <span className={styles.cell}>
        <span className={styles.label}>q</span>
        <span className={styles.value}>{hover ? hover.q : '—'}</span>
      </span>
      <span className={styles.cell}>
        <span className={styles.label}>r</span>
        <span className={styles.value}>{hover ? hover.r : '—'}</span>
      </span>
      <span className={styles.cell}>
        <span className={styles.label}>terrain</span>
        <span className={styles.value}>{hover?.terrain ? terrainLabel(hover.terrain) : '—'}</span>
      </span>
      <span className={styles.sep} />
      <span className={styles.cell}>
        <span className={styles.label}>zoom</span>
        <span className={styles.value}>{zoom.toFixed(2)}x</span>
      </span>
      <span className={styles.cell}>
        <span className={styles.label}>nodes</span>
        <span className={styles.value}>{nodeCount.toLocaleString()}</span>
      </span>
      <span className={styles.cell}>
        <span className={styles.label}>dirty</span>
        <span className={styles.value}>{dirtyCount}</span>
      </span>
    </footer>
  );
}
