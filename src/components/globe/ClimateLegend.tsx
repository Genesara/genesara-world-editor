import type { ClimateType, GlobeNode } from '../../types';
import { isCreatedNode } from '../../types';
import { allClimates, climateLabel } from '../../constants/climateGroups';
import { climateColorFor } from '../../constants/climateColors';
import styles from './ClimateLegend.module.css';

interface Props {
  nodes: Map<number, GlobeNode>;
  highlight: ClimateType | null;
  onHighlight: (climate: ClimateType | null) => void;
  onClose: () => void;
}

export function ClimateLegend({ nodes, highlight, onHighlight, onClose }: Props) {
  const counts = new Map<ClimateType, number>();
  for (const c of allClimates) counts.set(c, 0);
  for (const node of nodes.values()) {
    if (isCreatedNode(node)) {
      counts.set(node.climate, (counts.get(node.climate) ?? 0) + 1);
    }
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Climate legend">
      <div className={styles.header}>
        <span className={styles.title}>Climate Legend</span>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close legend"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className={styles.body}>
        {allClimates.map((c) => {
          const count = counts.get(c) ?? 0;
          const active = highlight === c;
          return (
            <button
              key={c}
              type="button"
              className={`${styles.row} ${active ? styles.rowActive : ''}`}
              onClick={() => onHighlight(active ? null : c)}
              aria-pressed={active}
            >
              <span
                className={styles.swatch}
                style={{ background: climateColorFor(c) }}
              />
              <span className={styles.label}>{climateLabel(c)}</span>
              <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>
      {highlight && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onHighlight(null)}
        >
          Clear highlight
        </button>
      )}
    </div>
  );
}
