type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

const labels: Record<AbilityName, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function AbilityEditor({ abilityNames, ancestryName, choiceAbility, choiceAmount, baseAbilities, abilities, modifiers, onChoiceAbilityChange, onAbilityChange }: {
  abilityNames: AbilityName[];
  ancestryName: string;
  choiceAbility: AbilityName;
  choiceAmount?: number;
  baseAbilities: Record<AbilityName, number>;
  abilities: Record<AbilityName, number>;
  modifiers: Record<AbilityName, number>;
  onChoiceAbilityChange: (ability: AbilityName) => void;
  onAbilityChange: (ability: AbilityName, value: number) => void;
}) {
  return <article className="ability-panel"><div><p className="eyebrow">ABILITY SCORES</p><h2>{ancestryName} abilities</h2></div>{choiceAmount && <label className="human-choice">{ancestryName} +{choiceAmount}<select value={choiceAbility} onChange={(event) => onChoiceAbilityChange(event.target.value as AbilityName)}>{abilityNames.map((ability) => <option key={ability} value={ability}>{labels[ability]}</option>)}</select></label>}<div className="ability-grid">{abilityNames.map((ability) => <label key={ability}><span>{labels[ability]}</span><input type="number" min="1" max="40" value={baseAbilities[ability]} onChange={(event) => onAbilityChange(ability, Number(event.target.value))} /><strong>{abilities[ability]} <small>{signed(modifiers[ability])}</small></strong></label>)}</div></article>;
}
