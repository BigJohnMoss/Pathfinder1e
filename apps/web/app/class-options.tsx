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

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const domainSpellLevel = (choice: Choice) => Number(choice.id.match(/^cleric-domain-spell-(\d+)$/)?.[1] ?? 0);

function OptionDetails({ option }: { option: Option }) {
  return <div className="option-details">
    <p>{option.benefit}</p>
    {option.powers && <div className="domain-powers"><strong>Granted powers</strong><ul>{option.powers.map((power) => <li key={`${power.level}-${power.name}`}><b>{power.name}</b> <small>level {power.level}</small><span>{power.summary}</span></li>)}</ul></div>}
    {option.domainSpells && <div className="domain-spells"><strong>Domain spells</strong><ol>{option.domainSpells.map((spell) => <li key={spell.level}><b>{spell.level}</b><span>{spell.name}</span></li>)}</ol></div>}
  </div>;
}

export function ClassOptions({ choices, selectedOptions, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; onOptionChange: (featureId: string, optionId: string) => void }) {
  const selectedDeity = choices.find((choice) => choice.id === "cleric-deity-1")?.selected;
  const selectedDomains = choices.filter((choice) => choice.id === "cleric-domain-1-first" || choice.id === "cleric-domain-1-second").flatMap((choice) => choice.selected ? [choice.selected] : []);
  const domainSlotChoices = choices.filter((choice) => domainSpellLevel(choice) > 0);
  const domainSpellOptions = (level: number) => {
    const byId = new Map<string, Option>();
    for (const domain of selectedDomains) {
      const spell = domain.domainSpells?.find((entry) => entry.level === level);
      if (!spell) continue;
      const id = `domain-spell-${level}-${slug(spell.name)}`;
      if (!byId.has(id)) byId.set(id, { id, name: spell.name, benefit: `Prepare ${spell.name} in this dedicated domain slot. Granted by ${domain.name}.` });
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  };
  const optionsFor = (choice: Choice) => {
    const spellLevel = domainSpellLevel(choice);
    if (spellLevel) return domainSpellOptions(spellLevel);
    if (!choice.id.startsWith("cleric-domain-")) return choice.options;
    return optionsGrantedBySelection(choice.options, selectedDeity);
  };

  useEffect(() => {
    for (const choice of choices) {
      const selectedId = selectedOptions[choice.id];
      const options = optionsFor(choice);
      if (selectedId && !options.some((option) => option.id === selectedId)) onOptionChange(choice.id, "");
      if (!selectedId && domainSpellLevel(choice) && selectedOptions[`${choice.id}-used`]) onOptionChange(`${choice.id}-used`, "");
    }
  }, [choices, selectedDeity?.id, selectedOptions, onOptionChange]);

  const refreshDomainSlots = () => domainSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));

  return <section className="choice-panel"><div><p className="eyebrow">CLASS OPTIONS</p><h2>Choose class features</h2><p>Each earned selectable feature gets its own choice.</p></div>{domainSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshDomainSlots}>Refresh domain spell slots</button>}{choices.map((choice) => {
    const options = optionsFor(choice);
    const spellLevel = domainSpellLevel(choice);
    const needsDeity = !spellLevel && choice.id.startsWith("cleric-domain-") && !selectedDeity;
    const needsDomains = Boolean(spellLevel) && selectedDomains.length === 0;
    const unavailableDetails = Boolean(spellLevel) && selectedDomains.length > 0 && options.length === 0;
    const selected = options.find((option) => option.id === selectedOptions[choice.id]);
    const usedKey = `${choice.id}-used`;
    const used = selectedOptions[usedKey] === "used";
    const placeholder = needsDeity ? "Choose a deity first" : needsDomains ? "Choose domains first" : unavailableDetails ? "Domain spell details unavailable" : "Choose an option";
    return <article className="choice-card" key={choice.id}><label>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => { onOptionChange(choice.id, event.target.value); if (spellLevel) onOptionChange(usedKey, ""); }} disabled={needsDeity || needsDomains || unavailableDetails}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id} disabled={!spellLevel && Object.entries(selectedOptions).some(([id, value]) => id !== choice.id && value === option.id)}>{option.name}</option>)}</select></label>{selected && <OptionDetails option={selected} />}{Boolean(spellLevel) && selected && <div className="domain-slot-use"><output aria-label={`${choice.name} status`}>{used ? "Used" : "Available"}</output><button type="button" aria-label={`Cast ${selected.name} from ${choice.name}`} disabled={used} onClick={() => onOptionChange(usedKey, "used")}>{used ? "Used" : "Cast domain spell"}</button></div>}</article>;
  })}</section>;
}
