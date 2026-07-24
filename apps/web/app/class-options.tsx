import { useEffect } from "react";
import { optionsGrantedBySelection } from "../../../packages/engine/src/dependent-options.js";

type Option = {
  id: string;
  name: string;
  benefit: string;
  domains?: string[];
  powers?: Array<{ name: string; level: number; summary: string }>;
  domainSpells?: Array<{ level: number; name: string }>;
};
type Choice = { id: string; name: string; level: number; options: Option[]; selected?: Option };

function OptionDetails({ option }: { option: Option }) {
  return <div className="option-details">
    <p>{option.benefit}</p>
    {option.powers && <div className="domain-powers"><strong>Granted powers</strong><ul>{option.powers.map((power) => <li key={`${power.level}-${power.name}`}><b>{power.name}</b> <small>level {power.level}</small><span>{power.summary}</span></li>)}</ul></div>}
    {option.domainSpells && <div className="domain-spells"><strong>Domain spells</strong><ol>{option.domainSpells.map((spell) => <li key={spell.level}><b>{spell.level}</b><span>{spell.name}</span></li>)}</ol></div>}
  </div>;
}

export function ClassOptions({ choices, selectedOptions, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; onOptionChange: (featureId: string, optionId: string) => void }) {
  const selectedDeity = choices.find((choice) => choice.id === "cleric-deity-1")?.selected;
  const optionsFor = (choice: Choice) => {
    if (!choice.id.startsWith("cleric-domain-")) return choice.options;
    return optionsGrantedBySelection(choice.options, selectedDeity);
  };

  useEffect(() => {
    for (const choice of choices) {
      const selectedId = selectedOptions[choice.id];
      if (selectedId && !optionsFor(choice).some((option) => option.id === selectedId)) onOptionChange(choice.id, "");
    }
  }, [choices, selectedDeity?.id, selectedOptions, onOptionChange]);

  return <section className="choice-panel"><div><p className="eyebrow">CLASS OPTIONS</p><h2>Choose class features</h2><p>Each earned selectable feature gets its own choice.</p></div>{choices.map((choice) => { const options = optionsFor(choice); const needsDeity = choice.id.startsWith("cleric-domain-") && !selectedDeity; return <label key={choice.id}>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => onOptionChange(choice.id, event.target.value)} disabled={needsDeity}><option value="">{needsDeity ? "Choose a deity first" : "Choose an option"}</option>{options.map((option) => <option key={option.id} value={option.id} disabled={Object.entries(selectedOptions).some(([id, value]) => id !== choice.id && value === option.id)}>{option.name}</option>)}</select>{choice.selected && <OptionDetails option={choice.selected} />}</label>; })}</section>;
}
