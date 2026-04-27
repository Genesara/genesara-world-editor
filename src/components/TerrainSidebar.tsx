import { useState } from 'react';
import type { TerrainType } from '../types';
import { terrainGroups, terrainLabel } from '../constants/terrainGroups';
import { terrainColors } from '../constants/terrainColors';
import styles from './TerrainSidebar.module.css';

interface Props {
  selected: TerrainType;
  onSelect: (t: TerrainType) => void;
}

export function TerrainSidebar({ selected, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed((p) => ({ ...p, [label]: !p[label] }));

  return (
    <aside className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLabel}>Active terrain</div>
        <div className={styles.active}>
          <span
            className={styles.swatch}
            style={{ background: terrainColors[selected] }}
          />
          <strong>{terrainLabel(selected)}</strong>
        </div>
      </div>
      <div className={styles.groups}>
        {terrainGroups.map((g) => {
          const open = !collapsed[g.label];
          return (
            <section key={g.label} className={styles.group}>
              <button
                type="button"
                className={styles.groupHeader}
                onClick={() => toggle(g.label)}
                aria-expanded={open}
              >
                <span className={styles.chevron} data-open={open} />
                {g.label}
                <span className={styles.count}>{g.terrains.length}</span>
              </button>
              {open && (
                <ul className={styles.list}>
                  {g.terrains.map((t) => {
                    const isSel = t === selected;
                    return (
                      <li key={t}>
                        <button
                          type="button"
                          className={`${styles.item} ${isSel ? styles.itemSelected : ''}`}
                          onClick={() => onSelect(t)}
                          title={t}
                        >
                          <span
                            className={styles.swatch}
                            style={{ background: terrainColors[t] }}
                          />
                          <span className={styles.itemLabel}>{terrainLabel(t)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
