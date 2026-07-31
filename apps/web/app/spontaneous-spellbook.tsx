import { useEffect, useMemo, useState } from "react";
import type { CharacterSpell } from "../../../packages/types/src/index.js";
import { SpellDetails } from "./spell-details";

type Spell = CharacterSpell;
type Slot = { level: number; base: number; bonus: number; count: number };
type KnownLimit = { level: number; count: number };
type SpellTraitBonuses = Record<string, { casterLevel: number; metamagicLevelAdjustment: number }>;

const levelLabel = (level: number) => level === 0 ? "Cantrips" : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}-level`;

export function SpontaneousSpellbook({ spells, spellTraitBonuses = {}, classId, className, castingAbilityName, slots, knownLimits, spellDcs, maximumSpellLevel, knownSpellIds, grantedSpellIds = [], grantedSpellLabel = classId === "oracle" ? "Mystery" : "Bloodline", onKnownSpellIdsChange, slotUses, onSlotUsesChange, onRefreshDay }: {
  spells: Spell[];
  spellTraitBonuses?: SpellTraitBonuses;
  classId: string;
  className: string;
  castingAbilityName: string;
  slots: Slot[];
  knownLimits: KnownLimit[];
  spellDcs: Record<number, number>;
  maximumSpellLevel: number;
  knownSpellIds: string[];
  grantedSpellIds?: string[];
  grantedSpellLabel?: string;
  onKnownSpellIdsChange: (spellIds: string[]) => void;
  slotUses: Record<number, number>;
  onSlotUsesChange: (uses: Record<number, number>) => void;
  onRefreshDay: () => void;
}) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(String(maximumSpellLevel));
  const [visibleLimit, setVisibleLimit] = useState(100);
  useEffect(() => setLevelFilter(String(maximumSpellLevel)), [maximumSpellLevel]);

  const granted = useMemo(() => new Set(grantedSpellIds), [grantedSpellIds]);
  const knownCount = (level: number) => knownSpellIds.filter((id) => spells.find((spell) => spell.id === id)?.levelByClass[classId] === level).length;
  const grantedCount = (level: number) => grantedSpellIds.filter((id) => spells.find((spell) => spell.id === id)?.levelByClass[classId] === level).length;
  const limitFor = (level: number) => knownLimits.find((entry) => entry.level === level)?.count ?? 0;
  const remainingSlots = (level: number) => { const slot = slots.find((entry) => entry.level === level); return slot ? slot.count - (slotUses[level] ?? 0) : Infinity; };
  const filteredSpells = useMemo(() => spells.filter((spell) => {
    const level = spell.levelByClass[classId];
    const matchesLevel = query ? true : levelFilter === "all" || level === Number(levelFilter);
    return matchesLevel && `${spell.name} ${spell.summary}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [classId, levelFilter, query, spells]);
  const groupedSpells = useMemo(() => filteredSpells.slice(0, visibleLimit).reduce((groups, spell) => {
    const level = spell.levelByClass[classId];
    (groups[level] ??= []).push(spell);
    return groups;
  }, {} as Record<number, Spell[]>), [classId, filteredSpells, visibleLimit]);
  useEffect(() => setVisibleLimit(100), [query, levelFilter, classId]);

  return <section className="spell-panel">
    <p className="eyebrow">SPELLS KNOWN</p>
    <h2>Spontaneous spells</h2>
    <p>{className} slots: {slots.length > 0 ? slots.map((slot) => `${remainingSlots(slot.level)}/${slot.count} ${levelLabel(slot.level)}${slot.bonus ? ` (${slot.base} base + ${slot.bonus} ${castingAbilityName})` : ""}`).join(", ") : "no leveled spell slots available"}.</p>
    <p>{knownLimits.map((limit) => `${knownCount(limit.level)}/${limit.count} known ${levelLabel(limit.level)}${grantedCount(limit.level) ? ` + ${grantedCount(limit.level)} ${grantedSpellLabel.toLowerCase()}` : ""}`).join(" · ")}</p>
    <div className="spell-day-controls"><button type="button" onClick={onRefreshDay}>Refresh day</button></div>
    {maximumSpellLevel === 0 && <p className="hint">Increase {castingAbilityName} to 11 or higher to cast 1st-level spells.</p>}
    <div className="spell-controls">
      <label>Search spells<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or effect" /></label>
      <label>Spell level<select aria-label="Spell level filter" value={levelFilter} disabled={Boolean(query)} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">All levels</option>{Array.from({ length: maximumSpellLevel + 1 }, (_, level) => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></label>
    </div>
    {filteredSpells.length === 0 ? <p className="hint">No spells match this search.</p> : <>{Object.entries(groupedSpells).map(([rawLevel, spellsAtLevel]) => {
      const level = Number(rawLevel);
      return <section className="spell-level" key={level}>
        <h3>{levelLabel(level)} <small>{spellsAtLevel.length} spells</small></h3>
        <div className="spell-list">{spellsAtLevel.map((spell) => {
          const learned = knownSpellIds.includes(spell.id);
          const isGranted = granted.has(spell.id);
          const known = learned || isGranted;
          const full = knownCount(level) >= limitFor(level);
          const canCast = level === 0 || remainingSlots(level) > 0;
          return <article key={spell.id}>
            <div><strong>{spell.name}</strong><small>level {level} · DC {spellDcs[level]} · {spell.summary}{spellTraitBonuses[spell.id]?.casterLevel ? ` · trait: +${spellTraitBonuses[spell.id].casterLevel} caster level` : ""}{spellTraitBonuses[spell.id]?.metamagicLevelAdjustment ? ` · trait: ${spellTraitBonuses[spell.id].metamagicLevelAdjustment} metamagic level adjustment` : ""}</small></div>
            <div className="spell-actions"><button type="button" className="cast-spell-button" aria-label={`Cast ${spell.name}`} disabled={!known || !canCast} onClick={() => { if (level > 0) onSlotUsesChange({ ...slotUses, [level]: (slotUses[level] ?? 0) + 1 }); }}>Cast</button><div className="spell-selection-control"><button type="button" aria-label={`Forget ${spell.name}`} disabled={!learned || isGranted} onClick={() => onKnownSpellIdsChange(knownSpellIds.filter((id) => id !== spell.id))}>Forget</button><output aria-label={`${spell.name} known`}>{isGranted ? grantedSpellLabel : learned ? "Known" : "Unknown"}</output><button type="button" aria-label={`Learn ${spell.name}`} disabled={known || full} onClick={() => onKnownSpellIdsChange([...knownSpellIds, spell.id])}>Learn</button></div></div>
            <SpellDetails spell={spell} />
          </article>;
        })}</div>
      </section>;
    })}{visibleLimit < filteredSpells.length && <button type="button" className="spell-show-more" onClick={() => setVisibleLimit(current => current + 100)}>Show 100 more spells</button>}</>}
  </section>;
}
