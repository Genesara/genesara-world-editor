import { useEffect, useMemo, useRef } from 'react';
import type { Node as HexTile, RaceId, StarterNode } from '../types';
import { KNOWN_RACES, formatRaceLabel, normalizeRaceId } from '../utils/enums';
import { raceColorFor } from '../constants/raceColors';
import styles from './StarterContextMenu.module.css';

interface Props {
  /** Tile that was right-clicked, or null if the click missed an existing hex. */
  tile: HexTile | null;
  /** All starter mappings for the current world. */
  starters: StarterNode[];
  /** Lookup of hex tiles in the *current* region by id, used to caption "in this region". */
  tilesById: Map<number, HexTile>;
  /** Screen-space anchor (clientX, clientY). */
  screenX: number;
  screenY: number;
  onAssign: (raceId: RaceId) => void;
  onClear: (raceId: RaceId) => void;
  onClose: () => void;
}

export function StarterContextMenu({
  tile,
  starters,
  tilesById,
  screenX,
  screenY,
  onAssign,
  onClear,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node | null)) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    // Use mousedown so the click that *opened* the menu doesn't immediately close it
    // (the open-click landed on the canvas, then this listener attaches).
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const startersByRace = useMemo(() => {
    const m = new Map<RaceId, StarterNode>();
    for (const s of starters) m.set(normalizeRaceId(s.raceId), s);
    return m;
  }, [starters]);

  // Position: clamp inside viewport. Naive — fixed at click. Browser handles overflow with scrollbars.
  const style = { left: screenX, top: screenY } as const;

  return (
    <div ref={ref} className={styles.root} style={style} role="menu">
      <div className={styles.header}>
        <div className={styles.headerTitle}>Starter spawn</div>
        <div className={styles.headerSubtitle}>
          {tile
            ? `Tile id ${tile.id ?? '—'} · ${tile.terrain.toLowerCase()} · (${tile.q}, ${tile.r})`
            : 'No tile here'}
        </div>
      </div>

      {KNOWN_RACES.map((race) => {
        const cur = startersByRace.get(race);
        const onThisTile = cur && tile?.id != null && cur.nodeId === tile.id;
        const elsewhereInRegion =
          cur && !onThisTile && tilesById.has(cur.nodeId)
            ? tilesById.get(cur.nodeId)
            : null;

        let caption: string;
        if (onThisTile) caption = 'spawns here';
        else if (cur) {
          if (elsewhereInRegion)
            caption = `in this region · tile id ${cur.nodeId}`;
          else caption = `assigned · tile id ${cur.nodeId}`;
        } else caption = 'unassigned';

        return (
          <div key={race} className={styles.row} role="menuitem">
            <span
              className={styles.swatch}
              style={{ background: raceColorFor(race) }}
              aria-hidden
            />
            <div className={styles.label}>
              <span className={styles.labelName}>
                {onThisTile && <span className={styles.labelCheck}>✓</span>}
                {formatRaceLabel(race)}
              </span>
              <span className={styles.labelCaption}>{caption}</span>
            </div>
            {onThisTile ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => onClear(race)}
              >
                Clear
              </button>
            ) : cur ? (
              <button
                type="button"
                className={styles.btn}
                onClick={() => onAssign(race)}
              >
                Override here
              </button>
            ) : (
              <button
                type="button"
                className={styles.btn}
                onClick={() => onAssign(race)}
              >
                Assign
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
