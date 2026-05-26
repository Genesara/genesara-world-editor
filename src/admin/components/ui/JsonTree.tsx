import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/admin/lib/cn';

interface Props {
  value: unknown;
  initiallyOpen?: boolean;
  className?: string;
}

export function JsonTree({ value, initiallyOpen = true, className }: Props) {
  return (
    <div className={cn('font-mono text-xs leading-relaxed text-fg-default', className)}>
      <Node value={value} depth={0} initiallyOpen={initiallyOpen} />
    </div>
  );
}

function Node({ value, depth, initiallyOpen }: { value: unknown; depth: number; initiallyOpen: boolean }) {
  if (value === null) return <span className="text-fg-muted">null</span>;
  if (value === undefined) return <span className="text-fg-muted">undefined</span>;
  const t = typeof value;
  if (t === 'string') return <span className="text-success">"{escape(value as string)}"</span>;
  if (t === 'number') return <span className="text-accent">{String(value)}</span>;
  if (t === 'boolean') return <span className="text-warning">{String(value)}</span>;
  if (Array.isArray(value)) return <ArrayNode value={value} depth={depth} initiallyOpen={initiallyOpen} />;
  if (t === 'object') return <ObjectNode value={value as Record<string, unknown>} depth={depth} initiallyOpen={initiallyOpen} />;
  return <span>{String(value)}</span>;
}

function ObjectNode({ value, depth, initiallyOpen }: { value: Record<string, unknown>; depth: number; initiallyOpen: boolean }) {
  const entries = Object.entries(value);
  const [open, setOpen] = useState(initiallyOpen && depth < 2);
  if (entries.length === 0) return <span className="text-fg-muted">{'{}'}</span>;
  return (
    <div className="inline-block align-top">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center text-fg-muted hover:text-fg-default"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span className="ml-1">{`{${entries.length}}`}</span>
      </button>
      {open && (
        <div className="pl-4 border-l border-border-subtle ml-1.5 mt-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <span className="text-fg-subtle shrink-0">"{k}":</span>
              <div className="min-w-0">
                <Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArrayNode({ value, depth, initiallyOpen }: { value: unknown[]; depth: number; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen && depth < 2);
  if (value.length === 0) return <span className="text-fg-muted">[]</span>;
  return (
    <div className="inline-block align-top">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center text-fg-muted hover:text-fg-default"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span className="ml-1">{`[${value.length}]`}</span>
      </button>
      {open && (
        <div className="pl-4 border-l border-border-subtle ml-1.5 mt-0.5">
          {value.map((v, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-fg-muted shrink-0">{i}:</span>
              <div className="min-w-0">
                <Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function escape(s: string): string {
  return s.replace(/[\\"\n\r\t]/g, (m) => {
    switch (m) {
      case '\\':
        return '\\\\';
      case '"':
        return '\\"';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      default:
        return m;
    }
  });
}
