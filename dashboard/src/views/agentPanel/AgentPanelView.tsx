import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRecent } from '@/lib/recent';
import { isApiError } from '@/lib/api/error';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Empty } from '@/components/ui/Empty';
import { useAgentQuery } from './hooks/useAgentQuery';
import { AgentPicker } from './AgentPicker';
import { AgentHeader } from './AgentHeader';
import { StatsTab } from './tabs/StatsTab';
import { SkillsPerksTab } from './tabs/SkillsPerksTab';
import { InventoryEquipmentTab } from './tabs/InventoryEquipmentTab';
import { SocialTab } from './tabs/SocialTab';
import { EventsTab } from './tabs/EventsTab';

const UUID_PREFIX_RE = /^[0-9a-f]{8}-/i;

const TABS = [
  { value: 'stats', label: 'Stats' },
  { value: 'skills', label: 'Skills + Perks' },
  { value: 'inventory', label: 'Inventory + Equipment' },
  { value: 'social', label: 'Social' },
  { value: 'events', label: 'Events' },
];

function AgentView({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const { pushAgent } = useRecent();
  const [tab, setTab] = useState('stats');

  const { data: agent, isLoading, error } = useAgentQuery(agentId);

  // Push to recent on successful load
  if (agent && !isLoading) {
    pushAgent(agentId);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton header */}
        <div className="flex items-center gap-3 px-4 h-11 border-b border-border-subtle bg-bg-base shrink-0">
          <div className="h-3 w-48 rounded bg-bg-raised animate-pulse" />
          <div className="h-5 w-16 rounded bg-bg-raised animate-pulse" />
        </div>
        <div className="flex-1 grid place-items-center">
          <span className="text-xs text-fg-muted">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    const is404 = isApiError(error) && error.is404;
    return (
      <div className="flex h-full items-center justify-center">
        <Empty
          title={is404 ? 'Agent not found' : 'Failed to load agent'}
          hint={
            <>
              {is404
                ? `No agent with ID ${agentId}`
                : (error as Error).message}{' '}
              —{' '}
              <Link
                to="/agents"
                className="text-accent hover:underline"
                onClick={() => navigate('/agents')}
              >
                Pick another
              </Link>
            </>
          }
        />
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <AgentHeader agent={agent} />

      <Tabs
        tabs={TABS}
        value={tab}
        onValueChange={setTab}
        className="flex-1 min-h-0"
      >
        <TabPanel
          value="stats"
          className="h-full data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
        >
          <StatsTab agent={agent} agentId={agentId} />
        </TabPanel>

        <TabPanel
          value="skills"
          className="h-full data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
        >
          <SkillsPerksTab agent={agent} agentId={agentId} />
        </TabPanel>

        <TabPanel
          value="inventory"
          className="h-full data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
        >
          <InventoryEquipmentTab agent={agent} agentId={agentId} />
        </TabPanel>

        <TabPanel
          value="social"
          className="h-full data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
        >
          <SocialTab agent={agent} agentId={agentId} />
        </TabPanel>

        <TabPanel
          value="events"
          className="h-full data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
        >
          <EventsTab agentId={agentId} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

export function AgentPanelView() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();

  // If we have an agentId param that looks like a UUID, show the panel
  if (agentId && UUID_PREFIX_RE.test(agentId)) {
    return (
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
        <AgentView agentId={agentId} />
      </div>
    );
  }

  // Otherwise show the picker
  return (
    <AgentPicker
      onSelect={(id) => {
        navigate(`/agents/${id}`);
      }}
    />
  );
}
