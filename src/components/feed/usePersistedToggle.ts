import { useCallback, useEffect, useState } from 'react';

export function usePersistedToggle(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return raw === '1';
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        setValue(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, set];
}
