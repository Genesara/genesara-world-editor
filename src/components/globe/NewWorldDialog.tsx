import { useState } from 'react';
import styles from './NewWorldDialog.module.css';
import { faceCountForFrequency, frequencyForNodeCount } from '../../utils/goldberg';

interface Props {
  onCancel: () => void;
  onSubmit: (input: { name: string; node_count: number; node_size: number }) => void;
  busy?: boolean;
}

const PRESETS = [
  { label: '42 (T=2)', value: 42 },
  { label: '92 (T=3)', value: 92 },
  { label: '252 (T=5)', value: 252 },
  { label: '492 (T=7)', value: 492 },
  { label: '812 (T=9)', value: 812 },
  { label: '1002 (T=10)', value: 1002 },
];

export function NewWorldDialog({ onCancel, onSubmit, busy }: Props) {
  const [name, setName] = useState('');
  const [nodeCount, setNodeCount] = useState(252);
  const [nodeSize, setNodeSize] = useState(20);

  const resolvedT = frequencyForNodeCount(nodeCount);
  const resolvedCount = faceCountForFrequency(resolvedT);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), node_count: nodeCount, node_size: nodeSize });
  };

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className={styles.title}>Create a new world</h2>

        <label className={styles.field}>
          <span className={styles.label}>Name</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aerth"
            autoFocus
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Node count <span className={styles.hint}>resolves to {resolvedCount} (T={resolvedT})</span>
          </span>
          <input
            type="number"
            className={styles.input}
            min={12}
            max={9002}
            value={nodeCount}
            onChange={(e) => setNodeCount(Math.max(12, Number(e.target.value) || 12))}
          />
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.value}
                className={`${styles.preset} ${nodeCount === p.value ? styles.presetActive : ''}`}
                onClick={() => setNodeCount(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Node size <span className={styles.hint}>hex radius per node: {nodeSize}</span>
          </span>
          <input
            type="range"
            min={8}
            max={40}
            value={nodeSize}
            onChange={(e) => setNodeSize(Number(e.target.value))}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.primary}`}
            disabled={busy || !name.trim()}
          >
            {busy ? 'Creating…' : 'Create world'}
          </button>
        </div>
      </form>
    </div>
  );
}
