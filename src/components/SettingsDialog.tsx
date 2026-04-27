import { useState } from 'react';
import { getApiBaseUrl, getDefaultBaseUrlSuggestion, setApiBaseUrl } from '../utils/apiConfig';
import styles from './SettingsDialog.module.css';

interface Props {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: Props) {
  const [url, setUrl] = useState(getApiBaseUrl() ?? getDefaultBaseUrlSuggestion());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setApiBaseUrl(url);
      setSaved(true);
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save URL');
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>
          Backend URL is stored in this browser. Changing it takes effect on the
          next request.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {saved && <div className={styles.success}>Saved.</div>}

        <label className={styles.field}>
          <span className={styles.label}>Backend URL</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
            autoFocus
            required
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.primary}`}
            disabled={saved}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
