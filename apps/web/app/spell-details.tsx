import type { CharacterSpell } from "../../../packages/types/src/index.js";

const fields = (spell: CharacterSpell) => [
  ["School", spell.schools?.join(", ") ?? spell.school],
  ["Casting time", spell.castingTime],
  ["Components", spell.components?.join(", ")],
  ["Range", spell.range],
  ["Target", spell.target],
  ["Area", spell.area],
  ["Effect", spell.effect],
  ["Duration", spell.duration],
  ["Saving throw", spell.savingThrow],
  ["Spell resistance", spell.spellResistance]
].filter((entry): entry is [string, string] => Boolean(entry[1]));

export function SpellDetails({ spell, derivedDuration }: { spell: CharacterSpell; derivedDuration?: { label: string; value: string } | null }) {
  if (!spell.description) return null;
  return <details className="spell-details">
    <summary>View full rules</summary>
    <div className="spell-details-body">
      <dl>{fields(spell).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {derivedDuration && <p className="derived-spell-rule"><strong>{derivedDuration.label}:</strong> duration becomes {derivedDuration.value} automatically, without increasing the spell slot or casting time.</p>}
      <div className="spell-description">{spell.description.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {spell.source?.url && <a className="spell-source-link" href={spell.source.url} target="_blank" rel="noreferrer">Rules source{spell.source.title ? ` · ${spell.source.title}${spell.source.page ? ` p. ${spell.source.page}` : ""}` : ""}</a>}
    </div>
  </details>;
}
