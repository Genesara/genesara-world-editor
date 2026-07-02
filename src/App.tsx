import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { WorldsScreen } from './screens/WorldsScreen';
import { GlobeScreen } from './screens/GlobeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { LoginScreen } from './screens/LoginScreen';
import { FirstLaunchScreen } from './screens/FirstLaunchScreen';
import { AdminScreen as EditorAdminScreen } from './screens/AdminScreen';

import { clearToken, getToken } from './utils/api';
import { API_BASE_URL_CHANGED_EVENT, hasApiBaseUrl } from './utils/apiConfig';

import { AuthProvider } from './lib/runtime/auth/AuthContext';
import { GlobalFeedProvider } from './lib/runtime/feed/GlobalFeedContext';
import { RecentProvider } from './lib/runtime/recent';
import { createQueryClient } from './lib/runtime/query/client';

/* --------------------------------------------------------------------------
 * Top-level gate: FirstLaunch (no base URL) or LoginScreen (no bearer)
 * Otherwise renders the routed tree. Auth state is in-memory per ADR-0004.
 * -------------------------------------------------------------------------- */

function useAuthFlags() {
  const [baseUrlReady, setBaseUrlReady] = useState<boolean>(() => hasApiBaseUrl());
  const [authed, setAuthed] = useState<boolean>(() => getToken() != null);

  useEffect(() => {
    const onLogin = () => setAuthed(true);
    const onLogout = () => setAuthed(false);
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

  return { baseUrlReady, authed };
}

function RootGate({ children }: { children: ReactNode }) {
  const { baseUrlReady, authed } = useAuthFlags();

  if (!baseUrlReady) {
    return <FirstLaunchScreen />;
  }
  if (!authed) {
    return <LoginScreen onLoggedIn={() => undefined} />;
  }
  return <>{children}</>;
}

/* --------------------------------------------------------------------------
 * Editor screen wrappers — translate route params + navigation to the
 * existing prop-based callbacks. The screens themselves are unchanged.
 * -------------------------------------------------------------------------- */

function WorldsRoute() {
  const nav = useNavigate();
  return (
    <WorldsScreen
      onEnterWorld={(worldId) => nav(`/worlds/${worldId}/globe`)}
      onLogout={() => clearToken()}
      onAdmin={() => nav('/worlds/admin')}
    />
  );
}

function GlobeRoute() {
  const nav = useNavigate();
  const { worldId } = useParams<{ worldId: string }>();
  const id = Number(worldId);
  if (!Number.isFinite(id)) return <Navigate to="/worlds" replace />;
  return (
    <GlobeScreen
      worldId={id}
      onBack={() => nav('/worlds')}
      onEnterNode={(sphereIndex) => nav(`/worlds/${id}/edit/${sphereIndex}`)}
    />
  );
}

function EditorRoute() {
  const nav = useNavigate();
  const { worldId, sphereIndex } = useParams<{ worldId: string; sphereIndex: string }>();
  const id = Number(worldId);
  const idx = sphereIndex ? Number(sphereIndex) : 0;
  if (!Number.isFinite(id)) return <Navigate to="/worlds" replace />;
  return (
    <EditorScreen
      worldId={id}
      sphereIndex={idx}
      onBack={() => nav(`/worlds/${id}/globe`)}
    />
  );
}

function EditorAdminRoute() {
  const nav = useNavigate();
  return <EditorAdminScreen onBack={() => nav('/worlds')} />;
}

export default function App() {
  const queryClient = useMemo(() => createQueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RootGate>
          <AuthProvider>
            <RecentProvider>
              <GlobalFeedProvider>
                <Routes>
                  <Route index element={<Navigate to="/worlds" replace />} />
                  <Route path="/worlds" element={<WorldsRoute />} />
                  <Route path="/worlds/admin" element={<EditorAdminRoute />} />
                  <Route path="/worlds/:worldId/globe" element={<GlobeRoute />} />
                  <Route path="/worlds/:worldId/edit/:sphereIndex" element={<EditorRoute />} />
                  <Route path="*" element={<Navigate to="/worlds" replace />} />
                </Routes>
              </GlobalFeedProvider>
            </RecentProvider>
          </AuthProvider>
        </RootGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
