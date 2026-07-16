type Spell = { id: string; name: string; levelByClass: Record<string, number>; summary: string };

export function Spellbook({ spells, maximumSpellLevel, preparedSpellIds, onPreparedSpellIdsChange }: { spells: Spell[]; maximumSpellLevel: number; preparedSpellIds: string[]; onPreparedSpellIdsChange: (spellIds: string[]) => void }) {
  return <section className="spell-panel"><p className="eyebrow">SPELLBOOK</p><h2>Prepared spells</h2><p>Starter spell catalogue — up to {maximumSpellLevel}th-level spells are available.</p>{spells.map((spell) => <label key={spell.id}><input type="checkbox" checked={preparedSpellIds.includes(spell.id)} onChange={() => onPreparedSpellIdsChange(preparedSpellIds.includes(spell.id) ? preparedSpellIds.filter((id) => id !== spell.id) : [...preparedSpellIds, spell.id])} /> {spell.name} <small>level {Math.min(...Object.values(spell.levelByClass))} · {spell.summary}</small></label>)}</section>;
}
