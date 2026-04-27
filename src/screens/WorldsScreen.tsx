import { useCallback, useEffect, useState } from 'react';
import type { World } from '../types';
import { useWorldsApi } from '../hooks/useWorldsApi';
import { NewWorldDialog } from '../components/globe/NewWorldDialog';
import { SettingsDialog } from '../components/SettingsDialog';
import styles from './WorldsScreen.module.css';

interface Props {
  onEnterWorld: (worldId: number) => void;
  onLogout: () => void;
}

export function WorldsScreen({ onEnterWorld, onLogout }: Props) {
  const api = useWorldsApi();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api
      .list()
      .then(setWorlds)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load worlds');
      });
  }, [api]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (input: { name: string; node_count: number; node_size: number }) => {
    try {
      const world = await api.create(input);
      setShowDialog(false);
      if (world.id != null) onEnterWorld(world.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create world');
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden />
          <div>
            <div className={styles.title}>Genesara</div>
            <div className={styles.subtitle}>Worlds</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setShowDialog(true)}
            disabled={api.loading}
          >
            + New World
          </button>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setShowSettings(true)}
            style={{ background: 'transparent', border: '1px solid #2a3548', color: '#99a4b6' }}
            title="Settings"
          >
            Settings
          </button>
          <button
            type="button"
            className={styles.newBtn}
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid #2a3548', color: '#99a4b6' }}
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {worlds.length === 0 && !api.loading && (
          <div className={styles.empty}>
            <p>No worlds yet.</p>
            <p className={styles.emptyHint}>
              Click <strong>+ New World</strong> to create your first one.
            </p>
          </div>
        )}
        <div className={styles.grid}>
          {worlds.map((w) => (
            <button
              type="button"
              key={w.id}
              className={styles.card}
              onClick={() => w.id != null && onEnterWorld(w.id)}
            >
              <div className={styles.cardGlobe} aria-hidden />
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{w.name}</div>
                <div className={styles.cardMeta}>
                  <span>{w.node_count} nodes</span>
                  <span className={styles.dot} />
                  <span>size {w.node_size}</span>
                </div>
                {w.created_at && (
                  <div className={styles.cardDate}>
                    {new Date(w.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showDialog && (
        <NewWorldDialog
          onCancel={() => setShowDialog(false)}
          onSubmit={handleCreate}
          busy={api.loading}
        />
      )}

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
