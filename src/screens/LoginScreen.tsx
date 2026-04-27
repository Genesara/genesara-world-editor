import { useState } from 'react';
import { login } from '../utils/api';
import styles from './LoginScreen.module.css';

interface Props {
  onLoggedIn: () => void;
}

export function LoginScreen({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden />
          <div className={styles.title}>AgenticRPG · Admin</div>
        </div>
        <div className={styles.subtitle}>Sign in to manage worlds and maps.</div>

        <div className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              className={styles.input}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className={styles.hint}>
            Bootstrap admin is created from the server's<br />
            <code>ADMIN_BOOTSTRAP_USERNAME</code> / <code>ADMIN_BOOTSTRAP_PASSWORD</code> env vars.
          </div>
        </div>
      </form>
    </div>
  );
}
