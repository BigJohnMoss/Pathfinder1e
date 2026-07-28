import { useEffect, useMemo, useState } from "react";
import { preparedSpellSlotUsage, spellPreparationCost } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import type { CharacterSpell } from "../../../packages/types/src/index.js";

type Spell = CharacterSpell;
type Slot = { level: number; base: number; bonus: number; count: number };
type PreparedLimit = { level: number; count: number };
type SpellTraitBonuses = Record<string, { casterLevel: number; metamagicLevelAdjustment: number }>;

const levelLabel = (level: number) => level === 0 ? "Cantrips" : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}-level`;

export function Spellbook({ spells, spellTraitBonuses = {}, classId, className, castingAbilityName, slots, preparedLimits, spellDcs, maximumSpellLevel, preparedSpellIds, onPreparedSpellIdsChange, slotUses, onSlotUsesChange, reservoir, onReservoirChange, onRefreshDay, oppositionSchoolIds = [], oppositionSpellIds = [] }: { spells: Spell[]; spellTraitBonuses?: SpellTraitBonuses; classId: string; className: string; castingAbilityName: string; slots: Slot[]; preparedLimits: PreparedLimit[]; spellDcs: Record<number, number>; maximumSpellLevel: number; preparedSpellIds: string[]; onPreparedSpellIdsChange: (spellIds: string[]) => void; slotUses: Record<number, number>; onSlotUsesChange: (uses: Record<number, number>) => void; reservoir: { current: number; maximum: number; dailyRefresh: number } | null; onReservoirChange: (value: number) => void; onRefreshDay: () => void; oppositionSchoolIds?: string[]; oppositionSpellIds?: string[] }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(String(maximumSpellLevel));
  useEffect(() => setLevelFilter(String(maximumSpellLevel)), [maximumSpellLevel]);

  const preparedUsage = useMemo(() => preparedSpellSlotUsage(preparedSpellIds, spells, classId, oppositionSchoolIds, oppositionSpellIds), [classId, oppositionSchoolIds, oppositionSpellIds, preparedSpellIds, spells]);
  const preparedCount = (level: number) => preparedUsage[level] ?? 0;
  const limitFor = (level: number) => preparedLimits.find((entry) => entry.level === level)?.count ?? 0;
  const remainingSlots = (level: number) => { const slot = slots.find((entry) => entry.level === level); return slot ? slot.count - (slotUses[level] ?? 0) : Infinity; };
  const filteredSpells = useMemo(() => spells.filter((spell) => {
    const level = spell.levelByClass[classId];
    const matchesLevel = query ? true : levelFilter === "all" || level === Number(levelFilter);
    return matchesLevel && `${spell.name} ${spell.summary}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [classId, levelFilter, query, spells]);
  const groupedSpells = useMemo(() => filteredSpells.reduce((groups, spell) => {
    const level = spell.levelByClass[classId];
    (groups[level] ??= []).push(spell);
    return groups;
  }, {} as Record<number, Spell[]>), [classId, filteredSpells]);

  return <section className="spell-panel">
    <p className="eyebrow">SPELLBOOK</p>
    <h2>Prepared spells</h2>
    <p>{className} slots: {slots.map((slot) => `${remainingSlots(slot.level)}/${slot.count} ${levelLabel(slot.level)}${slot.bonus ? ` (${slot.base} base + ${slot.bonus} ${castingAbilityName})` : ""}`).join(", ")}.</p>
    <p>{preparedLimits.map((limit) => `${preparedCount(limit.level)}/${limit.count} prepared ${levelLabel(limit.level)}`).join(" · ")}</p>
    <div className="spell-count"><button type="button" onClick={onRefreshDay}>Refresh day</button>{reservoir && <><output aria-label="Arcane Reservoir points">{reservoir.current}/{reservoir.maximum} reservoir</output><button type="button" aria-label="Spend reservoir point" disabled={reservoir.current === 0} onClick={() => onReservoirChange(reservoir.current - 1)}>-</button><button type="button" aria-label="Gain reservoir point" disabled={reservoir.current === reservoir.maximum} onClick={() => onReservoirChange(reservoir.current + 1)}>+</button></>}</div>
    {maximumSpellLevel === 0 && <p className="hint">Increase {castingAbilityName} to 11 or higher to cast 1st-level spells.</p>}
    <div className="spell-controls">
      <label>Search spells<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or effect" /></label>
      <label>Spell level<select aria-label="Spell level filter" value={levelFilter} disabled={Boolean(query)} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">All levels</option>{Array.from({ length: maximumSpellLevel + 1 }, (_, level) => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></label>
    </div>
    {filteredSpells.length === 0 ? <p className="hint">No spells match this search.</p> : Object.entries(groupedSpells).map(([rawLevel, spellsAtLevel]) => {
      const level = Number(rawLevel);
      return <section className="spell-level" key={level}>
        <h3>{levelLabel(level)} <small>{spellsAtLevel.length} spells</small></h3>
        <div className="spell-list">{spellsAtLevel.map((spell) => {
          const prepared = preparedSpellIds.filter((id) => id === spell.id).length;
          const preparationCost = spellPreparationCost(spell, oppositionSchoolIds, oppositionSpellIds);
          const full = preparedCount(level) + preparationCost > limitFor(level);
          const canCast = level === 0 || remainingSlots(level) > 0;
          return <article key={spell.id}>
            <div><strong>{spell.name}</strong><small>level {level} · DC {spellDcs[level]} · {spell.summary}{spellTraitBonuses[spell.id]?.casterLevel ? ` · trait: +${spellTraitBonuses[spell.id].casterLevel} caster level` : ""}{spellTraitBonuses[spell.id]?.metamagicLevelAdjustment ? ` · trait: ${spellTraitBonuses[spell.id].metamagicLevelAdjustment} metamagic level adjustment` : ""}{preparationCost === 2 ? " · opposition school: costs 2 prepared slots" : ""}</small></div>
            <div className="spell-count"><button type="button" aria-label={`Cast ${spell.name}`} disabled={prepared === 0 || !canCast} onClick={() => { if (level > 0) onSlotUsesChange({ ...slotUses, [level]: (slotUses[level] ?? 0) + 1 }); }}>Cast</button><button type="button" aria-label={`Remove ${spell.name}`} disabled={prepared === 0} onClick={() => onPreparedSpellIdsChange(preparedSpellIds.filter((id, index) => id !== spell.id || index !== preparedSpellIds.lastIndexOf(spell.id)))}>-</button><output aria-label={`${spell.name} prepared`}>{prepared}</output><button type="button" aria-label={`Add ${spell.name}`} disabled={full} onClick={() => onPreparedSpellIdsChange([...preparedSpellIds, spell.id])}>+</button></div>
          </article>;
        })}</div>
      </section>;
    })}
  </section>;
}
