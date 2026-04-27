import styles from './Toolbar.module.css';

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
}: Props) {
  return (
    <header className={styles.root}>
      {onBack && (
        <button type="button" className={styles.btn} onClick={onBack} title="Back to globe">
          ←
        </button>
      )}
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden />
        <div>
          <div className={styles.title}>AgenticRPG</div>
          <div className={styles.subtitle}>{breadcrumb ?? 'Map Editor'}</div>
        </div>
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
      <div className={styles.spacer} />
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
