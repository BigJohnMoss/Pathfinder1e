import type { CharacterSpell } from "../../../packages/types/src/index.js";

const fields = (spell: CharacterSpell, components?: string) => [
  ["School", spell.schools?.join(", ") ?? spell.school],
  ["Descriptors", spell.descriptors?.join(", ")],
  ["Casting time", spell.castingTime],
  ["Components", components],
  ["Range", spell.range],
  ["Target", spell.target],
  ["Area", spell.area],
  ["Effect", spell.effect],
  ["Duration", spell.duration],
  ["Saving throw", spell.savingThrow],
  ["Spell resistance", spell.spellResistance]
].filter((entry): entry is [string, string] => Boolean(entry[1]));

export function SpellDetails({ spell, derivedDuration, silentCasting = false }: {
  spell: CharacterSpell;
  derivedDuration?: { label: string; value: string } | null;
  silentCasting?: boolean;
}) {
  if (!spell.description) return null;
  const normalComponents = spell.components?.join(", ");
  const silentComponents = silentCasting && spell.components?.length
    ? spell.components.map((component) => component.split("/").filter((part) => !/^(?:V|verbal)$/i.test(part.trim())).join("/"))
      .filter(Boolean).join(", ") || "None"
    : normalComponents;
  return <details className="spell-details">
    <summary>View full rules</summary>
    <div className="spell-details-body">
      <dl>{fields(spell, silentComponents).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {silentComponents !== normalComponents && <p className="derived-spell-rule">The Deaf curse removes verbal components without changing spell level or casting time.</p>}
      {derivedDuration && <p className="derived-spell-rule"><strong>{derivedDuration.label}:</strong> duration becomes {derivedDuration.value} automatically, without increasing the spell slot or casting time.</p>}
      <div className="spell-description">{spell.description.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {spell.source?.url && <a className="spell-source-link" href={spell.source.url} target="_blank" rel="noreferrer">Rules source{spell.source.title ? ` · ${spell.source.title}${spell.source.page ? ` p. ${spell.source.page}` : ""}` : ""}</a>}
    </div>
  </details>;
}
