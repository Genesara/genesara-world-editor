import { Fragment, useEffect, useState } from 'react';
import { agentsApi, type AgentDetail } from '@/admin/lib/api/agents';
import { ApiError } from '@/admin/lib/api/error';
import styles from './AgentInspector.module.css';

interface Props {
  agentId: string;
  onClose: () => void;
}

export function AgentInspector({ agentId, onClose }: Props) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAgent(null);
    agentsApi
      .get(agentId)
      .then((a) => {
        if (cancelled) return;
        setAgent(a);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError) setError(e.detail ?? e.title);
        else if (e instanceof Error) setError(e.message);
        else setError('Failed to load agent');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <aside className={styles.panel} role="dialog" aria-label="Agent inspector">
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.eyebrow}>Agent</div>
            <div className={styles.name}>{agent?.name || agentId.slice(0, 8)}</div>
            <div className={styles.uuid}>{agentId}</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading && <div className={styles.loading}>Loading…</div>}
        {error && <div className={styles.error}>{error}</div>}
        {agent && (
          <div className={styles.body}>
            <section className={styles.section}>
              <div className={styles.sectionTitle}>Profile</div>
              <div className={styles.kvGrid}>
                <span className={styles.kvKey}>level</span>
                <span className={styles.kvVal}>{agent.level}</span>
                <span className={styles.kvKey}>xp</span>
                <span className={styles.kvVal}>{agent.xp}</span>
                {agent.raceId && (
                  <>
                    <span className={styles.kvKey}>race</span>
                    <span className={styles.kvVal}>{agent.raceId}</span>
                  </>
                )}
                {agent.classId && (
                  <>
                    <span className={styles.kvKey}>class</span>
                    <span className={styles.kvVal}>{agent.classId}</span>
                  </>
                )}
                {agent.nodeId != null && (
                  <>
                    <span className={styles.kvKey}>node</span>
                    <span className={styles.kvVal}>#{agent.nodeId}</span>
                  </>
                )}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>Gauges</div>
              <Gauge
                label="HP"
                value={agent.gauges.hp}
                max={agent.gauges.hpMax}
                tone={agent.gauges.hp / Math.max(1, agent.gauges.hpMax) < 0.3 ? 'danger' : 'friendly'}
              />
              <Gauge label="Stamina" value={agent.gauges.stamina} max={agent.gauges.staminaMax} />
              <Gauge label="Mana" value={agent.gauges.mana} max={agent.gauges.manaMax} />
              <Gauge label="Hunger" value={agent.gauges.hunger} max={100} />
              <Gauge label="Thirst" value={agent.gauges.thirst} max={100} />
              <Gauge label="Sleep" value={agent.gauges.sleep} max={100} />
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>Attributes</div>
              <div className={styles.kvGrid}>
                <span className={styles.kvKey}>str</span>
                <span className={styles.kvVal}>{agent.attributes.str}</span>
                <span className={styles.kvKey}>dex</span>
                <span className={styles.kvVal}>{agent.attributes.dex}</span>
                <span className={styles.kvKey}>con</span>
                <span className={styles.kvVal}>{agent.attributes.con}</span>
                <span className={styles.kvKey}>per</span>
                <span className={styles.kvVal}>{agent.attributes.per}</span>
                <span className={styles.kvKey}>int</span>
                <span className={styles.kvVal}>{agent.attributes.int}</span>
                <span className={styles.kvKey}>luck</span>
                <span className={styles.kvVal}>{agent.attributes.luck}</span>
                {agent.attributes.unspent > 0 && (
                  <>
                    <span className={styles.kvKey}>unspent</span>
                    <span className={styles.kvVal}>{agent.attributes.unspent}</span>
                  </>
                )}
              </div>
            </section>

            {agent.equipped.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>Equipped ({agent.equipped.length})</div>
                <div className={styles.kvGrid}>
                  {agent.equipped.map((eq) => (
                    <Fragment key={eq.instanceId}>
                      <span className={styles.kvKey}>{eq.slot}</span>
                      <span className={styles.kvVal}>
                        {eq.itemId} · {eq.rarity.toLowerCase()} · {eq.durabilityCurrent}/{eq.durabilityMax}
                      </span>
                    </Fragment>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function Gauge({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'danger' | 'friendly';
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const fillClass =
    tone === 'danger' ? styles.barFillDanger : tone === 'friendly' ? styles.barFillFriendly : '';
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeRow}>
        <span className={styles.gaugeLabel}>{label}</span>
        <span>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className={styles.bar}>
        <div className={`${styles.barFill} ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
