import { useCallback, useEffect, useMemo, useState } from 'react';
import { useZonesApi, type ZoneCreateBody } from '@/hooks/useZonesApi';
import type { NpcZone } from '@/lib/runtime/api/worlds';
import { ApiError } from '@/lib/runtime/api/error';
import styles from './ZonePanel.module.css';

interface Props {
  worldId: number;
  /** Persisted GlobeNode.id of the node currently open in the editor. */
  nodeId: number | undefined;
  onClose: () => void;
}

interface WeightRow {
  type: string;
  weight: string; // form string so the input stays controlled while typing
}

interface FormState {
  weights: WeightRow[];
  maxConcurrent: string;
  respawnTicks: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  weights: [{ type: '', weight: '1' }],
  maxConcurrent: '5',
  respawnTicks: '',
  active: true,
};

function zoneToForm(z: NpcZone): FormState {
  const weights: WeightRow[] = Object.entries(z.weights).map(([type, w]) => ({
    type,
    weight: String(w),
  }));
  if (weights.length === 0) weights.push({ type: '', weight: '1' });
  return {
    weights,
    maxConcurrent: String(z.maxConcurrent),
    respawnTicks: z.respawnTicks != null ? String(z.respawnTicks) : '',
    active: z.active,
  };
}

function formToBody(f: FormState): ZoneCreateBody | { error: string } {
  const weights: Record<string, number> = {};
  for (const row of f.weights) {
    const t = row.type.trim();
    if (!t) continue;
    const w = Number(row.weight);
    if (!Number.isFinite(w) || w <= 0) return { error: `Weight for ${t} must be > 0` };
    if (!Number.isInteger(w)) return { error: `Weight for ${t} must be an integer` };
    weights[t] = w;
  }
  if (Object.keys(weights).length === 0) return { error: 'At least one weight row is required' };

  const maxConcurrent = Number(f.maxConcurrent);
  if (!Number.isFinite(maxConcurrent) || maxConcurrent < 0) {
    return { error: 'maxConcurrent must be >= 0' };
  }
  const respawnTicks =
    f.respawnTicks.trim() === '' ? undefined : Number(f.respawnTicks);
  if (respawnTicks !== undefined && (!Number.isFinite(respawnTicks) || respawnTicks < 0)) {
    return { error: 'respawnTicks must be >= 0' };
  }
  return { weights, maxConcurrent: Math.floor(maxConcurrent), respawnTicks, active: f.active };
}

export function ZonePanel({ worldId, nodeId, onClose }: Props) {
  const api = useZonesApi(worldId);
  const zones = useMemo(() => api.forNode(nodeId), [api, nodeId]);

  const [editingId, setEditingId] = useState<string | null>(null); // 'new' for create draft
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingId == null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editingId]);

  const startCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setSaveError(null);
  }, []);

  const startEdit = useCallback((z: NpcZone) => {
    setForm(zoneToForm(z));
    setEditingId(z.zoneId);
    setSaveError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setSaveError(null);
  }, []);

  const submit = useCallback(async () => {
    if (editingId == null || nodeId == null) return;
    const parsed = formToBody(form);
    if ('error' in parsed) {
      setSaveError(parsed.error);
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      if (editingId === 'new') {
        await api.create(nodeId, parsed);
      } else {
        await api.patch(editingId, parsed);
      }
      setEditingId(null);
    } catch (e) {
      setSaveError(
        e instanceof ApiError ? e.detail ?? e.title : e instanceof Error ? e.message : 'Save failed',
      );
    } finally {
      setBusy(false);
    }
  }, [api, editingId, form, nodeId]);

  const handleDelete = useCallback(
    async (zoneId: string) => {
      if (!window.confirm('Delete this zone?')) return;
      setBusy(true);
      try {
        await api.remove(zoneId);
        if (editingId === zoneId) setEditingId(null);
      } catch (e) {
        setSaveError(
          e instanceof ApiError ? e.detail ?? e.title : e instanceof Error ? e.message : 'Delete failed',
        );
      } finally {
        setBusy(false);
      }
    },
    [api, editingId],
  );

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <aside className={styles.panel} role="dialog" aria-label="NPC zones for this node">
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.subtitle}>NPC Zones</div>
            <div className={styles.title}>
              {nodeId != null ? `Node #${nodeId}` : 'No node id yet'}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {api.error && <div className={styles.error}>{api.error}</div>}
          {saveError && <div className={styles.error}>{saveError}</div>}

          {nodeId == null && (
            <div className={styles.empty}>
              This node hasn't been persisted yet — create biome &amp; climate first.
            </div>
          )}

          {nodeId != null && (
            <>
              {zones.length === 0 && editingId !== 'new' && (
                <div className={styles.empty}>No zones on this node yet.</div>
              )}

              {zones.map((zone) =>
                editingId === zone.zoneId ? (
                  <ZoneForm
                    key={zone.zoneId}
                    form={form}
                    setForm={setForm}
                    busy={busy}
                    onCancel={cancelEdit}
                    onSubmit={submit}
                    submitLabel="Save changes"
                    editing
                  />
                ) : (
                  <ZoneCard
                    key={zone.zoneId}
                    zone={zone}
                    onEdit={() => startEdit(zone)}
                    onDelete={() => handleDelete(zone.zoneId)}
                  />
                ),
              )}

              {editingId === 'new' && (
                <ZoneForm
                  form={form}
                  setForm={setForm}
                  busy={busy}
                  onCancel={cancelEdit}
                  onSubmit={submit}
                  submitLabel="Create zone"
                />
              )}

              {editingId == null && (
                <button type="button" className={styles.addRow} onClick={startCreate}>
                  + Add zone
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function ZoneCard({
  zone,
  onEdit,
  onDelete,
}: {
  zone: NpcZone;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.zoneCard}>
      <div className={styles.cardRow}>
        <span className={`${styles.dot} ${zone.active ? '' : styles.dotInactive}`} />
        <span className={styles.zoneId}>{zone.zoneId}</span>
      </div>
      <div className={styles.weightChips}>
        {Object.entries(zone.weights).map(([type, w]) => (
          <span key={type} className={styles.weightChip}>
            {type}×{w}
          </span>
        ))}
      </div>
      <div className={styles.viewRow}>
        <span className={styles.viewKey}>max concurrent</span>
        <span>{zone.maxConcurrent}</span>
      </div>
      {zone.respawnTicks != null && (
        <div className={styles.viewRow}>
          <span className={styles.viewKey}>respawn ticks</span>
          <span>{zone.respawnTicks}</span>
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" className={`${styles.btnGhost} ${styles.btnDanger}`} onClick={onDelete}>
          Delete
        </button>
        <button type="button" className={styles.btnGhost} onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}

interface ZoneFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  busy: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  editing?: boolean;
}

function ZoneForm({ form, setForm, busy, onCancel, onSubmit, submitLabel, editing }: ZoneFormProps) {
  const updateWeight = (i: number, patch: Partial<WeightRow>) => {
    setForm((f) => {
      const next = f.weights.slice();
      next[i] = { ...next[i], ...patch };
      return { ...f, weights: next };
    });
  };
  const removeWeight = (i: number) => {
    setForm((f) => ({ ...f, weights: f.weights.filter((_, idx) => idx !== i) }));
  };
  const addWeight = () => {
    setForm((f) => ({ ...f, weights: [...f.weights, { type: '', weight: '1' }] }));
  };

  return (
    <div className={`${styles.zoneCard} ${styles.zoneCardEditing}`}>
      <div className={styles.sectionLabel}>Weights</div>
      <div className={styles.weightsList}>
        {form.weights.map((row, i) => (
          <div key={i} className={styles.weightRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="NPC type"
              value={row.type}
              onChange={(e) => updateWeight(i, { type: e.target.value })}
              aria-label={`NPC type ${i + 1}`}
            />
            <input
              type="number"
              min={1}
              className={styles.input}
              placeholder="weight"
              value={row.weight}
              onChange={(e) => updateWeight(i, { weight: e.target.value })}
              aria-label={`weight ${i + 1}`}
            />
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => removeWeight(i)}
              disabled={form.weights.length === 1}
              aria-label="Remove row"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.addRow} onClick={addWeight}>
        + Add type
      </button>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>max concurrent</span>
        <input
          type="number"
          min={0}
          className={styles.input}
          value={form.maxConcurrent}
          onChange={(e) => setForm((f) => ({ ...f, maxConcurrent: e.target.value }))}
          aria-label="max concurrent"
        />
      </div>

      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>respawn ticks</span>
        <input
          type="number"
          min={0}
          className={styles.input}
          placeholder="(optional)"
          value={form.respawnTicks}
          onChange={(e) => setForm((f) => ({ ...f, respawnTicks: e.target.value }))}
          aria-label="respawn ticks"
        />
      </div>

      <label className={styles.checkboxRow}>
        <span className={`${styles.checkbox} ${form.active ? styles.checkboxChecked : ''}`}>
          {form.active ? '✓' : ''}
        </span>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          style={{ display: 'none' }}
        />
        active
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={styles.btnPrimary} onClick={onSubmit} disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
      {editing && (
        <div className={styles.subtitle} style={{ alignSelf: 'flex-start' }}>
          editing
        </div>
      )}
    </div>
  );
}
