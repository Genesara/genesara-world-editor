import { useCallback, useEffect, useRef, useState } from 'react';
import { keyOf } from '../utils/keyOf';
import type { PointerKind } from '../components/three/HexPickerLayer';

interface Args {
  onPaint: (q: number, r: number) => void;
  onHoverChange: (info: { q: number; r: number } | null) => void;
}

/**
 * Translates picker-layer pointer events into paint actions.
 *
 *   pointerdown (left button) → start dragging, paint the hex
 *   pointermove (while dragging) → paint each new hex the cursor enters
 *   pointerup (anywhere) → stop dragging
 */
export function usePaintControls3D({ onPaint, onHoverChange }: Args) {
  const [hovered, setHovered] = useState<{ q: number; r: number } | null>(null);
  const draggingRef = useRef(false);
  const lastPaintRef = useRef<string | null>(null);

  // Releases happen anywhere — listen on the window so we don't get stuck in
  // drag mode if the user lets go off the canvas.
  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
      lastPaintRef.current = null;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const handlePointer = useCallback(
    (kind: PointerKind, info: { q: number; r: number; buttons: number } | null) => {
      if (!info) {
        if (hovered) {
          setHovered(null);
          onHoverChange(null);
        }
        return;
      }
      const { q, r, buttons } = info;
      const key = keyOf(q, r);

      if (!hovered || hovered.q !== q || hovered.r !== r) {
        const next = { q, r };
        setHovered(next);
        onHoverChange(next);
      }

      if (kind === 'down' && (buttons & 1) === 1) {
        draggingRef.current = true;
        lastPaintRef.current = key;
        onPaint(q, r);
        return;
      }

      if (kind === 'move' && draggingRef.current && lastPaintRef.current !== key) {
        lastPaintRef.current = key;
        onPaint(q, r);
      }
    },
    [hovered, onHoverChange, onPaint],
  );

  return { hovered, handlePointer };
}
