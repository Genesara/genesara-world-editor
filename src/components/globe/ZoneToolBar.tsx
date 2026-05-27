import styles from './ZoneToolBar.module.css';

export type ZoneMode = 'off' | 'create' | 'delete';

interface Props {
  mode: Exclude<ZoneMode, 'off'>;
  onModeChange: (mode: Exclude<ZoneMode, 'off'>) => void;
  createCount: number;
  deleteCount: number;
  existingCount: number;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function ZoneToolBar({
  mode,
  onModeChange,
  createCount,
  deleteCount,
  existingCount,
  saving,
  onCancel,
  onSave,
}: Props) {
  const dirty = createCount + deleteCount > 0;
  return (
    <div className={styles.bar} role="toolbar" aria-label="Zone tool">
      <span className={styles.label}>NPC Zones</span>
      <div className={styles.modes}>
        <button
          type="button"
          className={`${styles.modeBtn} ${styles.modeBtnCreate} ${
            mode === 'create' ? styles.modeActiveCreate : ''
          }`}
          onClick={() => onModeChange('create')}
        >
          + Create
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${mode === 'delete' ? styles.modeActiveDelete : ''}`}
          onClick={() => onModeChange('delete')}
        >
          − Delete
        </button>
      </div>
      <span className={styles.counters}>
        <span>{existingCount} existing</span>
        {createCount > 0 && <span className={styles.counterPlus}>+{createCount}</span>}
        {deleteCount > 0 && <span className={styles.counterMinus}>−{deleteCount}</span>}
      </span>
      <span className={styles.divider} />
      <button
        type="button"
        className={styles.btnGhost}
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </button>
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={onSave}
        disabled={!dirty || saving}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
