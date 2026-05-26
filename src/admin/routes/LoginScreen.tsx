import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/admin/lib/auth/AuthContext';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { InlineError } from '@/admin/components/ui/InlineError';
import { Shield } from 'lucide-react';

interface LocationState {
  from?: string;
}

export function LoginScreen() {
  const { login, isAuthenticated, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as LocationState | undefined)?.from ?? '/feed';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {
      // surfaced via loginError
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg-base px-4">
      <form
        onSubmit={onSubmit}
        className="surface-overlay w-full max-w-sm p-6 flex flex-col gap-5"
        aria-label="Admin login"
      >
        <div className="flex items-center gap-2">
          <div className="size-8 rounded bg-gradient-to-br from-accent to-accent-hover grid place-items-center text-accent-fg">
            <Shield className="size-4" />
          </div>
          <div>
            <div className="text-md font-medium text-fg-strong">Genesara · Admin</div>
            <div className="text-xs text-fg-muted">Operator sign-in</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-muted">Username</span>
            <Input
              value={username}
              autoComplete="username"
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-muted">Password</span>
            <Input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>

        {loginError && <InlineError error={loginError} />}

        <Button type="submit" variant="primary" disabled={isLoggingIn}>
          {isLoggingIn ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-2xs text-fg-muted">
          Bearer token is held in memory only. A page reload signs you out.
        </p>
      </form>
    </div>
  );
}
