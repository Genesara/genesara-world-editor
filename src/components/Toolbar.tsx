import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

export type EditorView = '2d' | '3d';

interface Props {
  dirtyCount: number;
  loading: boolean;
  onLoad: () => void;
  onNew: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onImport: () => void;
  onSave: () => void;
  onBack?: () => void;
  breadcrumb?: string;
  view: EditorView;
  onViewChange: (view: EditorView) => void;
  /** Optional toggles rendered before the Save button (Feed, Live overlay, History, etc.) */
  rightExtras?: ReactNode;
}

export function Toolbar({
  dirtyCount,
  loading,
  onLoad,
  onNew,
  onGenerate,
  onExport,
  onImport,
  onSave,
  onBack,
  breadcrumb,
  view,
  onViewChange,
  rightExtras,
}: Props) {
  return (
    <header className={styles.root}>
      {onBack && (
        <button type="button" className={styles.btn} onClick={onBack} title="Back to globe">
          ←
        </button>
      )}
      <div className={styles.brand}>
        <div className={styles.title}>Genesara</div>
        <div className={styles.subtitle}>{breadcrumb ?? 'World Editor'}</div>
      </div>
      <div className={styles.group}>
        <button type="button" className={styles.btn} onClick={onLoad} disabled={loading}>
          Load
        </button>
        <button type="button" className={styles.btn} onClick={onNew} disabled={loading}>
          New
        </button>
        <button type="button" className={styles.btn} onClick={onGenerate} disabled={loading}>
          Generate
        </button>
      </div>
      <div className={styles.group}>
        <button type="button" className={styles.btn} onClick={onExport} disabled={loading}>
          Export
        </button>
        <button type="button" className={styles.btn} onClick={onImport} disabled={loading}>
          Import
        </button>
      </div>
      <div className={styles.viewToggle} role="group" aria-label="View mode">
        <button
          type="button"
          className={`${styles.btn} ${view === '3d' ? styles.active : ''}`}
          onClick={() => onViewChange('3d')}
          aria-pressed={view === '3d'}
          title="Isometric 3D view"
        >
          3D
        </button>
        <button
          type="button"
          className={`${styles.btn} ${view === '2d' ? styles.active : ''}`}
          onClick={() => onViewChange('2d')}
          aria-pressed={view === '2d'}
          title="Top-down 2D view"
        >
          2D
        </button>
      </div>
      <div className={styles.spacer} />
      {rightExtras && <div className={styles.group}>{rightExtras}</div>}
      <button
        type="button"
        className={`${styles.btn} ${styles.save}`}
        onClick={onSave}
        disabled={dirtyCount === 0 || loading}
      >
        Save{dirtyCount > 0 ? ` (${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'})` : ''}
      </button>
    </header>
  );
}
