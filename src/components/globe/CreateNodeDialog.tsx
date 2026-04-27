import { useEffect, useMemo, useState } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import type { Biome, ClimateType } from '../../types';
import { biomeGroups, biomeLabel } from '../../constants/biomeGroups';
import { biomeColorFor } from '../../constants/biomeColors';
import { climateGroups, climateLabel } from '../../constants/climateGroups';
import { climateColorFor, effectFor, type ClimateEffect } from '../../constants/climateColors';
import { biomeIcons, climateIcons } from './createNodeIcons';
import styles from './CreateNodeDialog.module.css';

interface Props {
  sphereIndex: number;
  mode: 'create' | 'edit';
  initial?: { biome: Biome | null; climate: ClimateType | null };
  onCancel: () => void;
  onConfirm: (v: { biome: Biome; climate: ClimateType }) => Promise<void>;
  busy?: boolean;
}

const BIOME_WEIGHT = 0.7;
const CLIMATE_WEIGHT = 0.3;
const CARD_DARKEN = 0.85; // 15% darker

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHexComp(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function darken(hex: string, factor = CARD_DARKEN): string {
  const [r, g, b] = parseHex(hex);
  return `#${toHexComp(r * factor)}${toHexComp(g * factor)}${toHexComp(b * factor)}`;
}

function blendHex(biomeHex: string, climateHex: string): string {
  const [tr, tg, tb] = parseHex(biomeHex);
  const [cr, cg, cb] = parseHex(climateHex);
  const mix = (a: number, b: number) => a * BIOME_WEIGHT + b * CLIMATE_WEIGHT;
  return `#${toHexComp(mix(tr, cr))}${toHexComp(mix(tg, cg))}${toHexComp(mix(tb, cb))}`;
}

// YIQ perceived luminance (0–255). > 140 = treat as a "light" color and use dark text.
function isLight(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}


function effectHint(effect: ClimateEffect): string {
  switch (effect) {
    case 'SNOW_SHIMMER':
      return 'Faint snow shimmer';
    case 'BLUE_GRAY_TINT':
      return 'Subtle blue-gray tint';
    case 'EDGE_BRIGHTEN':
      return 'Bright edges';
    case 'BLUE_PULSE':
      return 'Soft blue pulse';
    case 'WARM_TINT':
      return 'Warm yellow tint';
    case 'GOLDEN_TINT':
      return 'Warm golden tint';
    case 'GREEN_SHIMMER':
      return 'Gentle green shimmer';
    case 'GREEN_PULSE':
      return 'Slow green pulse';
    case 'RIPPLE':
      return 'Expanding ripple';
    case 'DESATURATE':
      return 'Slight desaturation';
    case 'HEAT_SHIMMER':
      return 'Heat shimmer';
    case 'VOLCANIC_GLOW':
      return 'Orange-red edge glow';
    case 'SPARKLE':
      return 'Rotating sparkles';
  }
}

interface OptionCardProps {
  label: string;
  color: string;
  Icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

function OptionCard({ label, color, Icon, selected, onSelect }: OptionCardProps) {
  const bg = darken(color);
  const fg = isLight(bg) ? 'rgba(15, 22, 32, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  const fgMuted = isLight(bg) ? 'rgba(15, 22, 32, 0.78)' : 'rgba(255, 255, 255, 0.78)';
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      style={{ background: bg }}
      onClick={onSelect}
      title={label}
      aria-label={label}
      aria-pressed={selected}
    >
      <span className={styles.cardIcon} style={{ color: selected ? fg : fgMuted }}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className={styles.cardLabel} style={{ color: selected ? fg : fgMuted }}>
        {label}
      </span>
      {selected && (
        <span className={styles.cardCheck} aria-hidden="true">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export function CreateNodeDialog({
  sphereIndex,
  mode,
  initial,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  const [biome, setBiome] = useState<Biome | null>(initial?.biome ?? null);
  const [climate, setClimate] = useState<ClimateType | null>(initial?.climate ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const previewColor = useMemo(() => {
    if (!biome || !climate) return '#1a2230';
    return blendHex(biomeColorFor(biome), climateColorFor(climate));
  }, [biome, climate]);

  const previewEffect = climate ? effectFor(climate) : null;

  const canSubmit = !!biome && !!climate && !busy && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biome || !climate) return;
    setSubmitting(true);
    try {
      await onConfirm({ biome, climate });
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'create'
      ? `Create Node (sphere #${sphereIndex})`
      : `Edit Node #${sphereIndex}`;
  const ctaLabel = mode === 'create' ? 'Create Node' : 'Save changes';

  const biomeName = biome ? biomeLabel(biome) : null;
  const climateName = climate ? climateLabel(climate) : null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <form
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-node-title"
      >
        <h2 id="create-node-title" className={styles.title}>
          {title}
        </h2>

        <section className={styles.field}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Biome</span>
            {biomeName ? (
              <span className={styles.sectionSelection}>— {biomeName}</span>
            ) : (
              <span className={styles.sectionMuted}>— choose a biome</span>
            )}
          </div>
          <div className={styles.groups}>
            {biomeGroups.map((group) => (
              <div key={group.label} className={styles.group}>
                <div className={styles.groupLabel}>{group.label}</div>
                <div className={styles.cardGrid}>
                  {group.biomes.map((b) => (
                    <OptionCard
                      key={b}
                      label={biomeLabel(b)}
                      color={biomeColorFor(b)}
                      Icon={biomeIcons[b]}
                      selected={b === biome}
                      onSelect={() => setBiome(b)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.field}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Climate</span>
            {climateName ? (
              <span className={styles.sectionSelection}>— {climateName}</span>
            ) : (
              <span className={styles.sectionMuted}>— choose a climate</span>
            )}
          </div>
          <div className={styles.groups}>
            {climateGroups.map((group) => (
              <div key={group.label} className={styles.group}>
                <div className={styles.groupLabel}>{group.label}</div>
                <div className={styles.cardGrid}>
                  {group.climates.map((c) => (
                    <OptionCard
                      key={c}
                      label={climateLabel(c)}
                      color={climateColorFor(c)}
                      Icon={climateIcons[c]}
                      selected={c === climate}
                      onSelect={() => setClimate(c)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.preview}>
          <div
            className={`${styles.previewHex} ${previewEffect ? styles[`fx_${previewEffect}`] ?? '' : ''}`}
            style={{ background: previewColor }}
          />
          <div className={styles.previewMeta}>
            {biomeName || climateName ? (
              <>
                <div className={styles.previewTerrain}>{biomeName ?? '—'}</div>
                <div className={styles.previewClimate}>{climateName ?? '—'}</div>
                {previewEffect && (
                  <div className={styles.effectHint}>{effectHint(previewEffect)}</div>
                )}
              </>
            ) : (
              <div className={styles.previewEmpty}>
                Select biome and climate above
              </div>
            )}
          </div>
        </section>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={onCancel}
            disabled={busy || submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.primary}`}
            disabled={!canSubmit}
          >
            {submitting ? 'Saving…' : ctaLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
