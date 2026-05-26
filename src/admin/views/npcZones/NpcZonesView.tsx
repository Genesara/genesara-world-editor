import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { worldsApi } from '@/admin/lib/api/worlds';
import type { WorldId } from '@/admin/lib/types';
import { Card, CardSection } from '@/admin/components/ui/Card';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { InlineError } from '@/admin/components/ui/InlineError';
import { Empty } from '@/admin/components/ui/Empty';
import { ZoneRow } from './ZoneRow';
import { CreateZoneDialog } from './CreateZoneDialog';

// ── Top bar ──────────────────────────────────────────────────────────────────

interface TopBarProps {
  worldId: WorldId;
  onWorldIdChange: (id: WorldId) => void;
  onCreateClick: () => void;
}

const RECENT_WORLD_IDS: WorldId[] = [1, 2, 3];

function TopBar({ worldId, onWorldIdChange, onCreateClick }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 h-9 px-3 bg-bg-base border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-fg-muted">World</span>
        <Input
          mono
          type="number"
          value={worldId === 0 ? '' : worldId}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onWorldIdChange(isNaN(v) || v <= 0 ? 1 : v);
          }}
          placeholder="1"
          className="w-16 h-7 text-xs"
          aria-label="World ID"
        />
      </div>

      {/* Recent world chips */}
      <div className="h-4 w-px bg-border-default shrink-0" />
      <div className="flex items-center gap-1 min-w-0">
        {RECENT_WORLD_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onWorldIdChange(id)}
            className={[
              'shrink-0 mono text-2xs h-6 px-2 rounded border transition-colors duration-150',
              id === worldId
                ? 'bg-accent-subtle border-accent/40 text-accent'
                : 'bg-bg-raised border-border-default text-fg-subtle hover:text-fg-default hover:border-border-strong',
            ].join(' ')}
          >
            #{id}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <Button variant="primary" size="sm" onClick={onCreateClick}>
        Create zone
      </Button>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function NpcZonesView() {
  const [worldId, setWorldId] = useState<WorldId>(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: zones, isLoading, error } = useQuery({
    queryKey: ['zones', worldId],
    queryFn: () => worldsApi.listNpcZones(worldId),
    enabled: worldId > 0,
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <TopBar
        worldId={worldId}
        onWorldIdChange={setWorldId}
        onCreateClick={() => setCreateOpen(true)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-fg-strong">NPC Zones</h1>
            <span className="text-xs text-fg-muted">
              World <span className="mono">#{worldId}</span>
            </span>
          </div>

          <Card>
            <CardSection
              title="Zones"
              action={
                zones && zones.length > 0 ? (
                  <span className="mono text-2xs text-fg-muted">{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
                ) : undefined
              }
            >
              {isLoading && (
                <div className="text-xs text-fg-muted py-2">Loading zones…</div>
              )}
              {!isLoading && error && <InlineError error={error} className="py-2" />}
              {!isLoading && !error && (
                <div className="flex flex-col gap-1.5">
                  {!zones || zones.length === 0 ? (
                    <Empty
                      title="No NPC zones yet"
                      hint="Click Create zone to add the first one."
                    />
                  ) : (
                    zones.map((zone) => (
                      <ZoneRow
                        key={zone.zoneId}
                        zone={zone}
                        worldId={worldId}
                      />
                    ))
                  )}
                </div>
              )}
            </CardSection>
          </Card>
        </div>
      </div>

      <CreateZoneDialog
        worldId={worldId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
