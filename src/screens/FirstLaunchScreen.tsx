import { useState } from 'react';
import { getDefaultBaseUrlSuggestion, setApiBaseUrl } from '../utils/apiConfig';
import styles from './FirstLaunchScreen.module.css';

export function FirstLaunchScreen() {
  const [url, setUrl] = useState(getDefaultBaseUrlSuggestion());
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setApiBaseUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save URL');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.wordmark}>Genesara</div>
      <h1 className={styles.heading}>Setup.</h1>
      <p className={styles.subtitle}>
        Point this editor at the backend you want to manage. The URL is stored in your browser
        only — you can change it later from Settings.
      </p>

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="api-base-url">Backend URL</label>
            <input
              id="api-base-url"
              className={styles.input}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" className={styles.submit}>
            Save and continue
          </button>
        </div>
      </form>

      <div className={styles.hint}>
        must include the protocol, e.g. <code>https://api.example.com</code>
      </div>
    </div>
  );
}
