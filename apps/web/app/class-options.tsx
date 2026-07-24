import { useEffect } from "react";
import { alignmentsWithinOneStep, channelEnergyChoices } from "../../../packages/engine/src/cleric-alignment.js";
import { channelEnergyProgression } from "../../../packages/engine/src/channel-energy.js";
import { optionsGrantedBySelection } from "../../../packages/engine/src/dependent-options.js";
import { arcaneBondDetailOptions } from "../../../packages/engine/src/wizard-arcane-bond.js";
import { oppositionSchoolOptions } from "../../../packages/engine/src/wizard-schools.js";

type Option = {
  id: string;
  name: string;
  benefit: string;
  alignment?: string;
  polarity?: string;
  domains?: string[];
  powers?: Array<{ name: string; level: number; summary: string }>;
  domainSpells?: Array<{ level: number; name: string }>;
};
type Choice = { id: string; name: string; level: number; options: Option[]; selected?: Option };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const domainSpellLevel = (choice: Choice) => Number(choice.id.match(/^cleric-domain-spell-(\d+)$/)?.[1] ?? 0);
const isWizardOpposition = (choice: Choice) => choice.id.startsWith("wizard-opposition-school-");
const choiceOrder = (choice: Choice) => {
  if (choice.id === "wizard-arcane-bond-1") return 5;
  if (choice.id === "wizard-familiar-1" || choice.id === "wizard-bonded-object-1") return 6;
  if (choice.id === "cleric-deity-1" || choice.id === "wizard-arcane-school-1") return 10;
  if (choice.id === "cleric-alignment-1" || choice.id === "wizard-opposition-school-1-first") return 20;
  if (choice.id === "wizard-opposition-school-1-second") return 21;
  if (choice.id === "cleric-channel-energy-type-1") return 30;
  if (choice.id === "cleric-domain-1-first") return 40;
  if (choice.id === "cleric-domain-1-second") return 41;
  const spellLevel = domainSpellLevel(choice);
  return spellLevel ? 50 + spellLevel : 100;
};

function OptionDetails({ option }: { option: Option }) {
  return <div className="option-details">
    <p>{option.benefit}</p>
    {option.powers && <div className="domain-powers"><strong>Granted powers</strong><ul>{option.powers.map((power) => <li key={`${power.level}-${power.name}`}><b>{power.name}</b> <small>level {power.level}</small><span>{power.summary}</span></li>)}</ul></div>}
    {option.domainSpells && <div className="domain-spells"><strong>Domain spells</strong><ol>{option.domainSpells.map((spell) => <li key={spell.level}><b>{spell.level}</b><span>{spell.name}</span></li>)}</ol></div>}
  </div>;
}

function ChannelEnergyTracker({ level, charismaModifier, used, onUsedChange }: { level: number; charismaModifier: number; used: number; onUsedChange: (used: number) => void }) {
  const progression = channelEnergyProgression(level, charismaModifier);
  const normalizedUsed = Math.min(used, progression.usesPerDay);
  const remaining = progression.usesPerDay - normalizedUsed;
  return <div className="channel-tracker">
    <div><strong>{progression.dice}d6</strong><span>Will DC {progression.saveDC}</span></div>
    <output aria-label="Channel energy uses">{remaining}/{progression.usesPerDay} uses remaining</output>
    <div><button type="button" onClick={() => onUsedChange(normalizedUsed + 1)} disabled={remaining <= 0}>Use channel energy</button><button type="button" onClick={() => onUsedChange(0)} disabled={normalizedUsed === 0}>Refresh channels</button></div>
  </div>;
}

export function ClassOptions({ choices, selectedOptions, classLevel, charismaModifier, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; classLevel: number; charismaModifier: number; onOptionChange: (featureId: string, optionId: string) => void }) {
  const orderedChoices = [...choices].sort((left, right) => choiceOrder(left) - choiceOrder(right));
  const selectedDeity = orderedChoices.find((choice) => choice.id === "cleric-deity-1")?.selected;
  const selectedAlignment = orderedChoices.find((choice) => choice.id === "cleric-alignment-1")?.selected;
  const selectedArcaneBond = orderedChoices.find((choice) => choice.id === "wizard-arcane-bond-1")?.selected;
  const selectedWizardSchool = orderedChoices.find((choice) => choice.id === "wizard-arcane-school-1")?.selected;
  const selectedDomains = orderedChoices.filter((choice) => choice.id === "cleric-domain-1-first" || choice.id === "cleric-domain-1-second").flatMap((choice) => choice.selected ? [choice.selected] : []);
  const domainSlotChoices = orderedChoices.filter((choice) => domainSpellLevel(choice) > 0);
  const channelUsedKey = "cleric-channel-energy-used";
  const channelProgression = channelEnergyProgression(classLevel, charismaModifier);
  const channelUsed = Math.max(0, Number.parseInt(selectedOptions[channelUsedKey] ?? "0", 10) || 0);
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
    if (choice.id === "cleric-alignment-1") return alignmentsWithinOneStep(choice.options, selectedDeity?.alignment);
    if (choice.id === "cleric-channel-energy-type-1") return channelEnergyChoices(choice.options, selectedAlignment?.alignment, selectedDeity?.alignment);
    if (choice.id === "wizard-familiar-1") return arcaneBondDetailOptions(choice.options, selectedArcaneBond, "wizard-arcane-bond-familiar");
    if (choice.id === "wizard-bonded-object-1") return arcaneBondDetailOptions(choice.options, selectedArcaneBond, "wizard-arcane-bond-object");
    if (isWizardOpposition(choice)) return oppositionSchoolOptions(choice.options, selectedWizardSchool);
    const spellLevel = domainSpellLevel(choice);
    if (spellLevel) return domainSpellOptions(spellLevel);
    if (!choice.id.startsWith("cleric-domain-")) return choice.options;
    return optionsGrantedBySelection(choice.options, selectedDeity);
  };

  useEffect(() => {
    for (const choice of orderedChoices) {
      const selectedId = selectedOptions[choice.id];
      const options = optionsFor(choice);
      if (selectedId && !options.some((option) => option.id === selectedId)) onOptionChange(choice.id, "");
      if (choice.id === "cleric-channel-energy-type-1" && options.length === 1 && selectedId !== options[0].id) onOptionChange(choice.id, options[0].id);
      if (!selectedId && domainSpellLevel(choice) && selectedOptions[`${choice.id}-used`]) onOptionChange(`${choice.id}-used`, "");
    }
    if (channelUsed > channelProgression.usesPerDay) onOptionChange(channelUsedKey, String(channelProgression.usesPerDay));
  }, [choices, selectedDeity?.id, selectedAlignment?.id, selectedArcaneBond?.id, selectedWizardSchool?.id, selectedOptions, classLevel, charismaModifier, onOptionChange]);

  const refreshDomainSlots = () => domainSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));

  return <section className="choice-panel"><div><p className="eyebrow">CLASS OPTIONS</p><h2>Choose class features</h2><p>Dependent choices are ordered so each selection unlocks the next legal options.</p></div>{domainSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshDomainSlots}>Refresh domain spell slots</button>}{orderedChoices.map((choice) => {
    const options = optionsFor(choice);
    const spellLevel = domainSpellLevel(choice);
    const wizardOpposition = isWizardOpposition(choice);
    const wizardUniversalist = wizardOpposition && selectedWizardSchool?.id === "wizard-school-universalist";
    const needsWizardSchool = wizardOpposition && !selectedWizardSchool;
    const familiarChoice = choice.id === "wizard-familiar-1";
    const objectChoice = choice.id === "wizard-bonded-object-1";
    const needsArcaneBond = (familiarChoice || objectChoice) && !selectedArcaneBond;
    const wrongArcaneBond = familiarChoice && selectedArcaneBond?.id === "wizard-arcane-bond-object" || objectChoice && selectedArcaneBond?.id === "wizard-arcane-bond-familiar";
    const needsDeity = (choice.id === "cleric-alignment-1" || (!spellLevel && choice.id.startsWith("cleric-domain-"))) && !selectedDeity;
    const needsAlignment = choice.id === "cleric-channel-energy-type-1" && !selectedAlignment;
    const needsDomains = Boolean(spellLevel) && selectedDomains.length === 0;
    const unavailableDetails = Boolean(spellLevel) && selectedDomains.length > 0 && options.length === 0;
    const selected = options.find((option) => option.id === selectedOptions[choice.id]);
    const usedKey = `${choice.id}-used`;
    const used = selectedOptions[usedKey] === "used";
    const placeholder = needsArcaneBond ? "Choose an arcane bond first" : wrongArcaneBond ? familiarChoice ? "Familiar bond not selected" : "Bonded object not selected" : needsWizardSchool ? "Choose an arcane school first" : wizardUniversalist ? "Universalists have no opposition schools" : needsDeity ? "Choose a deity first" : needsAlignment ? "Choose alignment first" : needsDomains ? "Choose domains first" : unavailableDetails ? "Domain spell details unavailable" : options.length === 1 && choice.id === "cleric-channel-energy-type-1" ? "Determined by alignment" : "Choose an option";
    return <article className="choice-card" key={choice.id}><label>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => { onOptionChange(choice.id, event.target.value); if (spellLevel) onOptionChange(usedKey, ""); }} disabled={needsArcaneBond || wrongArcaneBond || needsWizardSchool || wizardUniversalist || needsDeity || needsAlignment || needsDomains || unavailableDetails || (choice.id === "cleric-channel-energy-type-1" && options.length === 1)}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id} disabled={!spellLevel && Object.entries(selectedOptions).some(([id, value]) => id !== choice.id && value === option.id)}>{option.name}</option>)}</select></label>{selected && <OptionDetails option={selected} />}{choice.id === "cleric-channel-energy-type-1" && selected && <ChannelEnergyTracker level={classLevel} charismaModifier={charismaModifier} used={channelUsed} onUsedChange={(next) => onOptionChange(channelUsedKey, String(next))} />}{Boolean(spellLevel) && selected && <div className="domain-slot-use"><output aria-label={`${choice.name} status`}>{used ? "Used" : "Available"}</output><button type="button" aria-label={`Cast ${selected.name} from ${choice.name}`} disabled={used} onClick={() => onOptionChange(usedKey, "used")}>{used ? "Used" : "Cast domain spell"}</button></div>}</article>;
  })}</section>;
}
