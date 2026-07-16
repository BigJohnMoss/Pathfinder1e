import { useEffect, useMemo, useState } from "react";

type Spell = { id: string; name: string; levelByClass: Record<string, number>; summary: string };
type Slot = { level: number; base: number; bonus: number; count: number };
type PreparedLimit = { level: number; count: number };

const levelLabel = (level: number) => level === 0 ? "Cantrips" : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}-level`;

export function Spellbook({ spells, classId, className, castingAbilityName, slots, preparedLimits, spellDcs, maximumSpellLevel, preparedSpellIds, onPreparedSpellIdsChange }: { spells: Spell[]; classId: string; className: string; castingAbilityName: string; slots: Slot[]; preparedLimits: PreparedLimit[]; spellDcs: Record<number, number>; maximumSpellLevel: number; preparedSpellIds: string[]; onPreparedSpellIdsChange: (spellIds: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(String(maximumSpellLevel));
  useEffect(() => setLevelFilter(String(maximumSpellLevel)), [maximumSpellLevel]);

  const preparedCount = (level: number) => preparedSpellIds.filter((id) => spells.find((spell) => spell.id === id)?.levelByClass[classId] === level).length;
  const limitFor = (level: number) => preparedLimits.find((entry) => entry.level === level)?.count ?? 0;
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
    <p>{className} slots: {slots.map((slot) => `${slot.count} ${levelLabel(slot.level)}${slot.bonus ? ` (${slot.base} base + ${slot.bonus} ${castingAbilityName})` : ""}`).join(", ")}.</p>
    <p>{preparedLimits.map((limit) => `${preparedCount(limit.level)}/${limit.count} prepared ${levelLabel(limit.level)}`).join(" · ")}</p>
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
          const full = preparedCount(level) >= limitFor(level);
          return <article key={spell.id}>
            <div><strong>{spell.name}</strong><small>level {level} · DC {spellDcs[level]} · {spell.summary}</small></div>
            <div className="spell-count"><button type="button" aria-label={`Remove ${spell.name}`} disabled={prepared === 0} onClick={() => onPreparedSpellIdsChange(preparedSpellIds.filter((id, index) => id !== spell.id || index !== preparedSpellIds.lastIndexOf(spell.id)))}>-</button><output aria-label={`${spell.name} prepared`}>{prepared}</output><button type="button" aria-label={`Add ${spell.name}`} disabled={full} onClick={() => onPreparedSpellIdsChange([...preparedSpellIds, spell.id])}>+</button></div>
          </article>;
        })}</div>
      </section>;
    })}
  </section>;
}
