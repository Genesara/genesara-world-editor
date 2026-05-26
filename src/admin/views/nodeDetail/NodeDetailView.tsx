import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecent } from '@/admin/lib/recent';
import { Button } from '@/admin/components/ui/Button';
import { Input } from '@/admin/components/ui/Input';
import { Empty } from '@/admin/components/ui/Empty';
import { BuildingsPanel } from './BuildingsPanel';
import { NpcsPanel } from './NpcsPanel';
import { AgentsAtNodePanel } from './AgentsAtNodePanel';

// ── World + node picker bar ──────────────────────────────────────────────────

interface PickerBarProps {
  worldId: number;
  onWorldIdChange: (id: number) => void;
  currentNodeId: number | null;
}

function PickerBar({ worldId, onWorldIdChange, currentNodeId }: PickerBarProps) {
  const navigate = useNavigate();
  const { nodes: recentNodes, pushNode } = useRecent();
  const [nodeInput, setNodeInput] = useState('');

  function handleOpen() {
    const id = parseInt(nodeInput, 10);
    if (isNaN(id) || id <= 0) return;
    pushNode(id);
    navigate(`/nodes/${id}`);
    setNodeInput('');
  }

  function handleRecentClick(nodeId: number) {
    pushNode(nodeId);
    navigate(`/nodes/${nodeId}`);
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 h-9 px-3 bg-bg-base border-b border-border-subtle shrink-0">
      {/* World id picker */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-fg-muted">World</span>
        <Input
          mono
          type="number"
          value={worldId === 0 ? '' : worldId}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onWorldIdChange(isNaN(v) ? 0 : v);
          }}
          placeholder="1"
          className="w-16 h-7 text-xs"
        />
      </div>

      <div className="h-4 w-px bg-border-default shrink-0" />

      {/* Node picker */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-fg-muted">Node #</span>
        <Input
          mono
          type="number"
          placeholder="node ID"
          value={nodeInput}
          onChange={(e) => setNodeInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(); }}
          className="w-24 h-7 text-xs"
        />
        <Button size="sm" variant="secondary" onClick={handleOpen} disabled={!nodeInput}>
          Open
        </Button>
      </div>

      {/* Recent node chips */}
      {recentNodes.length > 0 && (
        <>
          <div className="h-4 w-px bg-border-default shrink-0" />
          <div className="flex items-center gap-1 overflow-x-auto min-w-0">
            {recentNodes.map((id) => (
              <button
                key={id}
                onClick={() => handleRecentClick(id)}
                className={[
                  'shrink-0 mono text-2xs h-6 px-2 rounded border transition-colors duration-150',
                  id === currentNodeId
                    ? 'bg-accent-subtle border-accent/40 text-accent'
                    : 'bg-bg-raised border-border-default text-fg-subtle hover:text-fg-default hover:border-border-strong',
                ].join(' ')}
              >
                #{id}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function NodeDetailView() {
  const { nodeId: nodeIdParam } = useParams<{ nodeId: string }>();
  const [worldId, setWorldId] = useState<number>(1);

  const nodeId = nodeIdParam ? parseInt(nodeIdParam, 10) : null;
  const validNodeId = nodeId !== null && !isNaN(nodeId) && nodeId > 0;
  const validWorldId = worldId > 0;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <PickerBar
        worldId={worldId}
        onWorldIdChange={setWorldId}
        currentNodeId={validNodeId ? nodeId : null}
      />

      {!validNodeId ? (
        <div className="flex-1 grid place-items-center">
          <Empty
            title="Select a node"
            hint="Enter a node ID above and click Open, or pick a recent node."
          />
        </div>
      ) : !validWorldId ? (
        <div className="flex-1 grid place-items-center">
          <Empty title="Enter a world ID" hint="Set the world ID in the top bar to load node data." />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-4">
            {/* Node heading */}
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-medium text-fg-strong">
                Node <span className="mono text-accent">#{nodeId}</span>
              </h1>
              <span className="text-xs text-fg-muted">
                World <span className="mono">#{worldId}</span>
              </span>
            </div>

            <BuildingsPanel worldId={worldId} nodeId={nodeId} />
            <NpcsPanel worldId={worldId} nodeId={nodeId} />
            <AgentsAtNodePanel nodeId={nodeId} />
          </div>
        </div>
      )}
    </div>
  );
}
