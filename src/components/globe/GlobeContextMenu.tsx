import { useEffect } from 'react';
import styles from './GlobeContextMenu.module.css';

export interface ContextMenuItem {
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function GlobeContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`.${styles.menu}`)) return;
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('pointerdown', handlePointer, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointer, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keep the menu inside the viewport.
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 30 - items.length * 32),
  };

  return (
    <div
      className={styles.menu}
      style={style}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={`${styles.item} ${item.destructive ? styles.destructive : ''}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
