import type { CharacterTrait } from "./character-catalogue";

const categoryLabels = { combat: "Combat", faith: "Faith", magic: "Magic", social: "Social" };

export function TraitChoices({
  traits,
  selectedTraitIds,
  selectedTraitChoices,
  onChange,
  onChoiceChange,
}: {
  traits: CharacterTrait[];
  selectedTraitIds: string[];
  selectedTraitChoices: Record<string, string>;
  onChange: (index: number, traitId: string) => void;
  onChoiceChange: (traitId: string, choice: string) => void;
}) {
  return <section className="trait-panel">
    <p className="eyebrow">CHARACTER TRAITS</p>
    <h2>Choose background traits</h2>
    <p>Choose up to two traits from different categories. Your GM may adjust the number of traits allowed for the campaign.</p>
    <div className="trait-slots">{[0, 1].map((index) => {
      const selected = traits.find((trait) => trait.id === selectedTraitIds[index]);
      const other = traits.find((trait) => trait.id === selectedTraitIds[index === 0 ? 1 : 0]);
      return <article key={index}>
        <label>Trait {index + 1}
          <select value={selected?.id ?? ""} onChange={(event) => onChange(index, event.target.value)}>
            <option value="">No trait selected</option>
            {traits.map((trait) => <option key={trait.id} value={trait.id} disabled={trait.id === other?.id || trait.category === other?.category}>
              {trait.name} ({categoryLabels[trait.category]})
            </option>)}
          </select>
        </label>
        {selected && <div><strong>{selected.name}</strong><span>{categoryLabels[selected.category]} trait</span><p>{selected.summary}</p>
          {selected.choice && <label>{selected.choice.label}
            <select value={selectedTraitChoices[selected.id] ?? ""} onChange={(event) => onChoiceChange(selected.id, event.target.value)}>
              <option value="">Choose a skill</option>
              {selected.choice.options.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
            </select>
          </label>}
        </div>}
      </article>;
    })}</div>
  </section>;
}
