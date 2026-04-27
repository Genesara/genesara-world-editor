import { useEffect, useState } from 'react';
import type { ViewState } from './types';
import { WorldsScreen } from './screens/WorldsScreen';
import { GlobeScreen } from './screens/GlobeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { LoginScreen } from './screens/LoginScreen';
import { FirstLaunchScreen } from './screens/FirstLaunchScreen';
import { clearToken, getToken } from './utils/api';
import { API_BASE_URL_CHANGED_EVENT, hasApiBaseUrl } from './utils/apiConfig';

export default function App() {
  const [baseUrlReady, setBaseUrlReady] = useState<boolean>(() => hasApiBaseUrl());
  const [authed, setAuthed] = useState<boolean>(() => getToken() != null);
  const [view, setView] = useState<ViewState>({ type: 'worlds' });

  useEffect(() => {
    const onLogin = () => setAuthed(true);
    const onLogout = () => {
      setAuthed(false);
      setView({ type: 'worlds' });
    };
    const onBaseUrlChanged = () => setBaseUrlReady(hasApiBaseUrl());
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:logout', onLogout);
    window.addEventListener(API_BASE_URL_CHANGED_EVENT, onBaseUrlChanged);
    return () => {
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener(API_BASE_URL_CHANGED_EVENT, onBaseUrlChanged);
    };
  }, []);

  if (!baseUrlReady) {
    return <FirstLaunchScreen />;
  }

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