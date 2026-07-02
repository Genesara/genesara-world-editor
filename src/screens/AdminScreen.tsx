import { useMemo, useState } from 'react';
import type { EquipmentInstance, ItemCatalogEntry, Rarity } from '../types';
import { useEquipmentApi } from '../hooks/useEquipmentApi';
import { RARITIES } from '../utils/enums';
import { getItemCatalog, getRegisteredAgents } from '../mocks/storage';
import styles from './AdminScreen.module.css';

interface Props {
  onBack: () => void;
}

export function AdminScreen({ onBack }: Props) {
  const equipmentApi = useEquipmentApi();

  const catalog = useMemo<ItemCatalogEntry[]>(() => getItemCatalog(), []);
  const agents = useMemo<string[]>(() => getRegisteredAgents(), []);
  const equipmentItems = useMemo(
    () => catalog.filter((e) => e.category === 'EQUIPMENT'),
    [catalog],
  );

  const [agentId, setAgentId] = useState<string>(agents[0] ?? '');
  const [itemId, setItemId] = useState<string>(equipmentItems[0]?.itemId ?? '');
  const [rarity, setRarity] = useState<Rarity | ''>('');
  const [durability, setDurability] = useState<string>('');
  const [creatorAgentId, setCreatorAgentId] = useState<string>('');
  const [lastSeeded, setLastSeeded] = useState<EquipmentInstance | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const seedEquipment = async () => {
    setSeedError(null);
    setLastSeeded(null);
    try {
      const instance = await equipmentApi.seed(agentId, {
        itemId,
        ...(rarity !== '' ? { rarity } : {}),
        ...(durability !== '' ? { durabilityCurrent: Number(durability) } : {}),
        ...(creatorAgentId !== '' ? { creatorAgentId } : {}),
      });
      setLastSeeded(instance);
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to seed equipment');
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <div className={styles.title}>Admin</div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Seed equipment</div>
            <div className={styles.sectionSub}>
              Place an equipment instance on an agent. Validates against catalog and registry.
            </div>
          </div>

          {seedError && <div className={styles.error}>{seedError}</div>}
          {lastSeeded && (
            <div className={styles.success}>
              Seeded <span className={styles.code}>{lastSeeded.itemId}</span>{' '}
              ({lastSeeded.rarity}) — durability {lastSeeded.durabilityCurrent}/
              {lastSeeded.durabilityMax}, instanceId{' '}
              <span className={styles.code}>{lastSeeded.instanceId}</span>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="agent-select">
                Agent
              </label>
              <select
                id="agent-select"
                className={styles.select}
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="item-select">
                Item
              </label>
              <select
                id="item-select"
                className={styles.select}
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                {/* Show all catalog items so the user can intentionally hit the
                    "category must be EQUIPMENT" validation if they pick a consumable. */}
                {catalog.map((e) => (
                  <option key={e.itemId} value={e.itemId}>
                    {e.itemId} ({e.category})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rarity-select">
                Rarity (optional)
              </label>
              <select
                id="rarity-select"
                className={styles.select}
                value={rarity}
                onChange={(e) => setRarity(e.target.value as Rarity | '')}
              >
                <option value="">— catalog default —</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="durability-input">
                Durability (optional)
              </label>
              <input
                id="durability-input"
                className={styles.input}
                type="number"
                min={0}
                value={durability}
                onChange={(e) => setDurability(e.target.value)}
                placeholder="max"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="creator-select">
                Creator agent (optional)
              </label>
              <select
                id="creator-select"
                className={styles.select}
                value={creatorAgentId}
                onChange={(e) => setCreatorAgentId(e.target.value)}
              >
                <option value="">— none —</option>
                {agents.map((a) => (
                  <option key={a} value={a}>
                    {a.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>&nbsp;</label>
              <button
                type="button"
                className={styles.btn}
                onClick={seedEquipment}
                disabled={!agentId || !itemId || equipmentApi.loading}
              >
                {equipmentApi.loading ? 'Seeding…' : 'Seed'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
