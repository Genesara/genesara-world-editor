import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { GlobalFeedProvider } from '@/lib/feed/GlobalFeedContext';
import { RecentProvider } from '@/lib/recent';
import { createQueryClient } from '@/lib/query/client';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { LoginScreen } from '@/routes/LoginScreen';
import { Shell } from '@/components/layout/Shell';
import { LiveFeedView } from '@/views/liveFeed/LiveFeedView';
import { AgentPanelView } from '@/views/agentPanel/AgentPanelView';
import { NodeDetailView } from '@/views/nodeDetail/NodeDetailView';
import { WorldMapView } from '@/views/worldMap/WorldMapView';
import { AuditLogView } from '@/views/auditLog/AuditLogView';
import { NpcZonesView } from '@/views/npcZones/NpcZonesView';
import { FeedReplayView } from '@/views/feedReplay/FeedReplayView';

export function App() {
  const queryClient = useMemo(() => createQueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/dashboard">
        <AuthProvider>
          <RecentProvider>
            <GlobalFeedProvider>
              <Routes>
                <Route path="/login" element={<LoginScreen />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Shell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/feed" replace />} />
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
                <Route path="*" element={<Navigate to="/feed" replace />} />
              </Routes>
            </GlobalFeedProvider>
          </RecentProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
