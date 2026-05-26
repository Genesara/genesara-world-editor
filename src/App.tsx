import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

// --- editor screens (unchanged design — wrapped into routes below) ---
import { WorldsScreen } from './screens/WorldsScreen';
import { GlobeScreen } from './screens/GlobeScreen';
import { EditorScreen } from './screens/EditorScreen';
import { LoginScreen } from './screens/LoginScreen';
import { FirstLaunchScreen } from './screens/FirstLaunchScreen';
import { AdminScreen as EditorAdminScreen } from './screens/AdminScreen';

import { clearToken, getToken } from './utils/api';
import { API_BASE_URL_CHANGED_EVENT, hasApiBaseUrl } from './utils/apiConfig';

// --- admin (operator) views ---
import { AuthProvider } from './admin/lib/auth/AuthContext';
import { GlobalFeedProvider } from './admin/lib/feed/GlobalFeedContext';
import { RecentProvider } from './admin/lib/recent';
import { createQueryClient } from './admin/lib/query/client';
import { AdminShell } from './admin/components/layout/Shell';
import { LiveFeedView } from './admin/views/liveFeed/LiveFeedView';
import { AgentPanelView } from './admin/views/agentPanel/AgentPanelView';
import { NodeDetailView } from './admin/views/nodeDetail/NodeDetailView';
import { WorldMapView } from './admin/views/worldMap/WorldMapView';
import { AuditLogView } from './admin/views/auditLog/AuditLogView';
import { NpcZonesView } from './admin/views/npcZones/NpcZonesView';
import { FeedReplayView } from './admin/views/feedReplay/FeedReplayView';

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
      onOperations={() => nav('/admin/feed')}
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

/* --------------------------------------------------------------------------
 * Auth provider sits inside the router (uses navigate on logout).
 * -------------------------------------------------------------------------- */

function ProtectedRedirectOnLogout({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const onLogout = () => {
      // If a logout happens mid-flow we don't unmount the tree (RootGate does
      // that based on `authed`), but we make sure we land back on /worlds the
      // next time the user signs in.
      if (loc.pathname.startsWith('/admin')) nav('/worlds', { replace: true });
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [nav, loc.pathname]);
  return <>{children}</>;
}

/* --------------------------------------------------------------------------
 * The router.
 * -------------------------------------------------------------------------- */

export default function App() {
  const queryClient = useMemo(() => createQueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RootGate>
          <AuthProvider>
            <RecentProvider>
              <GlobalFeedProvider>
                <ProtectedRedirectOnLogout>
                  <Routes>
                    <Route index element={<Navigate to="/worlds" replace />} />
                    <Route path="/worlds" element={<WorldsRoute />} />
                    <Route path="/worlds/admin" element={<EditorAdminRoute />} />
                    <Route path="/worlds/:worldId/globe" element={<GlobeRoute />} />
                    <Route path="/worlds/:worldId/edit/:sphereIndex" element={<EditorRoute />} />

                    <Route path="/admin" element={<AdminShell />}>
                      <Route index element={<Navigate to="/admin/feed" replace />} />
                      <Route path="feed" element={<LiveFeedView />} />
                      <Route path="agents" element={<AgentPanelView />} />
                      <Route path="agents/:agentId" element={<AgentPanelView />} />
                      <Route path="nodes" element={<NodeDetailView />} />
                      <Route path="nodes/:nodeId" element={<NodeDetailView />} />
                      <Route path="map" element={<WorldMapView />} />
                      <Route path="zones" element={<NpcZonesView />} />
                      <Route path="replay" element={<FeedReplayView />} />
                      <Route path="audit" element={<AuditLogView />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/worlds" replace />} />
                  </Routes>
                  <Outlet />
                </ProtectedRedirectOnLogout>
              </GlobalFeedProvider>
            </RecentProvider>
          </AuthProvider>
        </RootGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
