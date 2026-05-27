import { useEffect, useRef } from 'react';
import styles from './LayersMenu.module.css';

export interface LayerOption {
  id: string;
  label: string;
  active: boolean;
  count?: number;
  onToggle: () => void;
}

interface Props {
  options: LayerOption[];
  onClose: () => void;
}

export function LayersMenu({ options, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className={styles.menu} ref={ref} role="menu" aria-label="Map layers">
      {options.map((opt) => (
        <div
          key={opt.id}
          className={styles.row}
          onClick={opt.onToggle}
          role="menuitemcheckbox"
          aria-checked={opt.active}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              opt.onToggle();
            }
          }}
        >
          <span className={`${styles.checkbox} ${opt.active ? styles.checkboxChecked : ''}`}>
            {opt.active ? '✓' : ''}
          </span>
          <span className={styles.label}>{opt.label}</span>
          {opt.count != null && <span className={styles.count}>{opt.count}</span>}
        </div>
      ))}
    </div>
  );
}
