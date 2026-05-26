import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface WeightRow {
  key: string;
  value: string; // string so input is always controlled; parse on submit
}

interface Props {
  rows: WeightRow[];
  onChange: (rows: WeightRow[]) => void;
}

export function weightsFromRows(rows: WeightRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = r.key.trim();
    const v = parseInt(r.value, 10);
    if (k && !isNaN(v) && v > 0) out[k] = v;
  }
  return out;
}

export function rowsFromWeights(weights: Record<string, number>): WeightRow[] {
  return Object.entries(weights).map(([key, value]) => ({ key, value: String(value) }));
}

export function WeightsEditor({ rows, onChange }: Props) {
  const baseId = useId();

  function handleKeyChange(i: number, key: string) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, key } : r)));
  }

  function handleValueChange(i: number, value: string) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, value } : r)));
  }

  function handleRemove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function handleAdd() {
    onChange([...rows, { key: '', value: '' }]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length === 0 && (
        <div className="text-xs text-fg-muted italic py-1">No weight entries yet.</div>
      )}
      {rows.map((row, i) => (
        <div key={`${baseId}-${i}`} className="flex items-center gap-1.5">
          <Input
            mono
            placeholder="NPC_TYPE"
            value={row.key}
            onChange={(e) => handleKeyChange(i, e.target.value)}
            className="flex-1"
            aria-label={`Weight key ${i + 1}`}
          />
          <span className="text-xs text-fg-muted shrink-0">=</span>
          <Input
            mono
            type="number"
            min={1}
            placeholder="1"
            value={row.value}
            onChange={(e) => handleValueChange(i, e.target.value)}
            className="w-20"
            aria-label={`Weight value ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="shrink-0 text-fg-muted hover:text-danger transition-colors p-1 rounded"
            aria-label={`Remove weight row ${i + 1}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={handleAdd} className="self-start">
        <Plus className="size-3" />
        Add entry
      </Button>
    </div>
  );
}
