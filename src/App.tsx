import { useEffect, useState } from 'react';
import type { ViewState } from './types';
import { WorldsScreen } from './screens/WorldsScreen';
import { GlobeScreen } from './screens/GlobeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { LoginScreen } from './screens/LoginScreen';
import { clearToken, getToken } from './utils/api';

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => getToken() != null);
  const [view, setView] = useState<ViewState>({ type: 'worlds' });

  useEffect(() => {
    const onLogin = () => setAuthed(true);
    const onLogout = () => {
      setAuthed(false);
      setView({ type: 'worlds' });
    };
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  if (!authed) {
    return <LoginScreen onLoggedIn={() => setAuthed(true)} />;
  }

  if (view.type === 'worlds') {
    return (
      <WorldsScreen
        onEnterWorld={(worldId) => setView({ type: 'globe', worldId })}
        onLogout={() => clearToken()}
      />
    );
  }

  if (view.type === 'globe') {
    return (
      <GlobeScreen
        worldId={view.worldId}
        onBack={() => setView({ type: 'worlds' })}
        onEnterNode={(sphereIndex) =>
          setView({ type: 'editor', worldId: view.worldId, sphereIndex })
        }
      />
    );
  }

  return (
    <EditorScreen
      worldId={view.worldId}
      sphereIndex={view.sphereIndex}
      onBack={() => setView({ type: 'globe', worldId: view.worldId })}
    />
  );
}
