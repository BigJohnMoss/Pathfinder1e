import { useEffect } from "react";
import { spells as characterSpells, type CharacterSpell } from "./character-catalogue";
import { alignmentsWithinOneStep, channelEnergyChoices } from "../../../packages/engine/src/cleric-alignment.js";
import { channelEnergyProgression } from "../../../packages/engine/src/channel-energy.js";
import { optionsGrantedBySelection } from "../../../packages/engine/src/dependent-options.js";
import { arcaneBondDetailOptions } from "../../../packages/engine/src/wizard-arcane-bond.js";
import { oppositionSchoolOptions } from "../../../packages/engine/src/wizard-schools.js";
import { specialistSchoolSpells } from "../../../packages/engine/src/wizard-specialist-slots.js";

type BloodlineVariant = { id: string; name: string; energyType: string; breathShape?: string; movement?: string };
type Option = {
  id: string;
  name: string;
  benefit: string;
  alignment?: string;
  polarity?: string;
  domains?: string[];
  classSkill?: string;
  classSkillChoices?: string[];
  variants?: BloodlineVariant[];
  arcana?: string;
  bonusSpells?: Array<{ sorcererLevel: number; spellLevel: number; name: string }>;
  bonusFeats?: string[];
  powers?: Array<{ name: string; level: number; summary: string }>;
  domainSpells?: Array<{ level: number; name: string }>;
};
type Choice = { id: string; name: string; level: number; options: Option[]; selected?: Option };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const domainSpellLevel = (choice: Choice) => Number(choice.id.match(/^cleric-domain-spell-(\d+)$/)?.[1] ?? 0);
const specialistSpellLevel = (choice: Choice) => Number(choice.id.match(/^wizard-specialist-spell-(\d+)$/)?.[1] ?? 0);
const isWizardOpposition = (choice: Choice) => choice.id.startsWith("wizard-opposition-school-");
const isPaladinMercy = (choice: Choice) => choice.id.startsWith("paladin-mercy-");
const choiceOrder = (choice: Choice) => {
  if (choice.id === "wizard-arcane-bond-1") return 5;
  if (choice.id === "wizard-familiar-1" || choice.id === "wizard-bonded-object-1") return 6;
  if (choice.id === "cleric-deity-1" || choice.id === "wizard-arcane-school-1" || choice.id === "sorcerer-bloodline-1") return 10;
  if (choice.id === "paladin-divine-bond-5") return 11;
  if (choice.id === "cleric-alignment-1" || choice.id === "wizard-opposition-school-1-first") return 20;
  if (choice.id === "wizard-opposition-school-1-second") return 21;
  const specialistLevel = specialistSpellLevel(choice);
  if (specialistLevel) return 30 + specialistLevel;
  if (choice.id === "cleric-channel-energy-type-1") return 30;
  if (choice.id === "cleric-domain-1-first") return 40;
  if (choice.id === "cleric-domain-1-second") return 41;
  const domainLevel = domainSpellLevel(choice);
  return domainLevel ? 50 + domainLevel : 100;
};

const variantDetail = (variant: BloodlineVariant) => variant.breathShape ?? variant.movement ?? "";

function OptionDetails({ option }: { option: Option }) {
  const bloodline = Boolean(option.arcana || option.bonusSpells || option.bonusFeats || option.classSkill);
  return <div className="option-details">
    <p>{option.benefit}</p>
    {option.classSkill && <p><strong>Bloodline class skill:</strong> {option.classSkill}</p>}
    {option.arcana && <p><strong>Bloodline arcana:</strong> {option.arcana}</p>}
    {option.variants && <div className="domain-powers"><strong>Bloodline variants</strong><ul>{option.variants.map((variant) => <li key={variant.id}><b>{variant.name}</b><span>{variant.energyType}{variantDetail(variant) && ` · ${variantDetail(variant)}`}</span></li>)}</ul></div>}
    {option.powers && <div className="domain-powers"><strong>{bloodline ? "Bloodline powers" : "Granted powers"}</strong><ul>{option.powers.map((power) => <li key={`${power.level}-${power.name}`}><b>{power.name}</b> <small>level {power.level}</small><span>{power.summary}</span></li>)}</ul></div>}
    {option.bonusSpells && <div className="domain-spells"><strong>Bloodline bonus spells</strong><ol>{option.bonusSpells.map((spell) => <li key={spell.sorcererLevel}><b>{spell.sorcererLevel}</b><span>{spell.name} <small>spell level {spell.spellLevel}</small></span></li>)}</ol></div>}
    {option.bonusFeats && <div className="domain-powers"><strong>Bloodline bonus feats</strong><ul>{option.bonusFeats.map((feat) => <li key={feat}><span>{feat}</span></li>)}</ul></div>}
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

const spellAsOption = (spell: CharacterSpell, schoolName: string): Option => ({
  id: spell.id,
  name: spell.name,
  benefit: `Prepare ${spell.name} in this dedicated ${schoolName} specialist slot. ${spell.summary}`
});

export function ClassOptions({ choices, selectedOptions, classLevel, charismaModifier, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; classLevel: number; charismaModifier: number; onOptionChange: (featureId: string, optionId: string) => void }) {
  const orderedChoices = [...choices].sort((left, right) => choiceOrder(left) - choiceOrder(right));
  const selectedDeity = orderedChoices.find((choice) => choice.id === "cleric-deity-1")?.selected;
  const selectedAlignment = orderedChoices.find((choice) => choice.id === "cleric-alignment-1")?.selected;
  const selectedArcaneBond = orderedChoices.find((choice) => choice.id === "wizard-arcane-bond-1")?.selected;
  const selectedHuntersBond = orderedChoices.find((choice) => choice.id === "ranger-hunters-bond-4")?.selected;
  const selectedWizardSchool = orderedChoices.find((choice) => choice.id === "wizard-arcane-school-1")?.selected;
  const selectedSorcererBloodline = orderedChoices.find((choice) => choice.id === "sorcerer-bloodline-1")?.selected;
  const selectedDomains = orderedChoices.filter((choice) => choice.id === "cleric-domain-1-first" || choice.id === "cleric-domain-1-second").flatMap((choice) => choice.selected ? [choice.selected] : []);
  const domainSlotChoices = orderedChoices.filter((choice) => domainSpellLevel(choice) > 0);
  const specialistSlotChoices = orderedChoices.filter((choice) => specialistSpellLevel(choice) > 0);
  const bloodlineSkillKey = "sorcerer-bloodline-class-skill";
  const bloodlineSkillChoices = selectedSorcererBloodline?.classSkillChoices ?? [];
  const bloodlineVariantKey = "sorcerer-bloodline-variant";
  const bloodlineVariants = selectedSorcererBloodline?.variants ?? [];
  const selectedBloodlineVariant = bloodlineVariants.find((variant) => variant.id === selectedOptions[bloodlineVariantKey]);
  const isElementalBloodline = selectedSorcererBloodline?.id === "sorcerer-bloodline-elemental";
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
  const specialistOptions = (level: number) => {
    const schoolName = selectedWizardSchool?.name.replace(/ School$/, "") ?? "school";
    return specialistSchoolSpells(characterSpells, selectedWizardSchool, level).map((spell) => spellAsOption(spell, schoolName));
  };
  const optionsFor = (choice: Choice) => {
    if (choice.id === "cleric-alignment-1") return alignmentsWithinOneStep(choice.options, selectedDeity?.alignment);
    if (choice.id === "cleric-channel-energy-type-1") return channelEnergyChoices(choice.options, selectedAlignment?.alignment, selectedDeity?.alignment);
    if (choice.id === "wizard-familiar-1") return arcaneBondDetailOptions(choice.options, selectedArcaneBond, "wizard-arcane-bond-familiar");
    if (choice.id === "wizard-bonded-object-1") return arcaneBondDetailOptions(choice.options, selectedArcaneBond, "wizard-arcane-bond-object");
    if (isPaladinMercy(choice)) {
      const selectedByOtherMercy = orderedChoices
        .filter((other) => other.id !== choice.id && isPaladinMercy(other))
        .map((other) => selectedOptions[other.id])
        .filter((id): id is string => Boolean(id));
      return choice.options.filter((option) => !selectedByOtherMercy.includes(option.id));
    }
    const specialistLevel = specialistSpellLevel(choice);
    if (specialistLevel) return specialistOptions(specialistLevel);
    if (isWizardOpposition(choice)) return oppositionSchoolOptions(choice.options, selectedWizardSchool);
    const domainLevel = domainSpellLevel(choice);
    if (domainLevel) return domainSpellOptions(domainLevel);
    if (!choice.id.startsWith("cleric-domain-")) return choice.options;
    return optionsGrantedBySelection(choice.options, selectedDeity);
  };

  useEffect(() => {
    const seenMercies = new Set<string>();
    for (const choice of orderedChoices) {
      const selectedId = selectedOptions[choice.id];
      if (isPaladinMercy(choice) && selectedId) {
        if (seenMercies.has(selectedId)) {
          onOptionChange(choice.id, "");
          continue;
        }
        seenMercies.add(selectedId);
      }
      const options = optionsFor(choice);
      if (selectedId && !options.some((option) => option.id === selectedId)) onOptionChange(choice.id, "");
      if (choice.id === "cleric-channel-energy-type-1" && options.length === 1 && selectedId !== options[0].id) onOptionChange(choice.id, options[0].id);
      if (!selectedId && (domainSpellLevel(choice) || specialistSpellLevel(choice)) && selectedOptions[`${choice.id}-used`]) onOptionChange(`${choice.id}-used`, "");
    }
    const selectedBloodlineSkill = selectedOptions[bloodlineSkillKey];
    if (selectedBloodlineSkill && !bloodlineSkillChoices.includes(selectedBloodlineSkill)) onOptionChange(bloodlineSkillKey, "");
    const selectedVariantId = selectedOptions[bloodlineVariantKey];
    if (selectedVariantId && !bloodlineVariants.some((variant) => variant.id === selectedVariantId)) onOptionChange(bloodlineVariantKey, "");
    if (channelUsed > channelProgression.usesPerDay) onOptionChange(channelUsedKey, String(channelProgression.usesPerDay));
  }, [choices, selectedDeity?.id, selectedAlignment?.id, selectedArcaneBond?.id, selectedHuntersBond?.id, selectedWizardSchool?.id, selectedSorcererBloodline?.id, selectedOptions, classLevel, charismaModifier, onOptionChange]);

  const refreshDomainSlots = () => domainSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));
  const refreshSpecialistSlots = () => specialistSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));

  return <section className="choice-panel"><div><p className="eyebrow">FEATURE CHOICES</p><h2>Configure class features</h2><p>Dependent choices are ordered so each selection unlocks the next legal options.</p></div>{domainSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshDomainSlots}>Refresh domain spell slots</button>}{specialistSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshSpecialistSlots}>Refresh specialist school slots</button>}{orderedChoices.map((choice) => {
    const options = optionsFor(choice);
    const domainLevel = domainSpellLevel(choice);
    const specialistLevel = specialistSpellLevel(choice);
    const trackedSpellSlot = Boolean(domainLevel || specialistLevel);
    const wizardOpposition = isWizardOpposition(choice);
    const specialistUniversalist = Boolean(specialistLevel) && selectedWizardSchool?.id === "wizard-school-universalist";
    const wizardUniversalist = wizardOpposition && selectedWizardSchool?.id === "wizard-school-universalist";
    const needsWizardSchool = (wizardOpposition || Boolean(specialistLevel)) && !selectedWizardSchool;
    const familiarChoice = choice.id === "wizard-familiar-1";
    const objectChoice = choice.id === "wizard-bonded-object-1";
    const companionChoice = choice.id === "ranger-animal-companion-4";
    const needsArcaneBond = (familiarChoice || objectChoice) && !selectedArcaneBond;
    const wrongArcaneBond = (familiarChoice && selectedArcaneBond?.id === "wizard-arcane-bond-object") || (objectChoice && selectedArcaneBond?.id === "wizard-arcane-bond-familiar");
    const needsHuntersBond = companionChoice && !selectedHuntersBond;
    const wrongHuntersBond = companionChoice && selectedHuntersBond?.id !== "ranger-hunters-bond-animal";
    const needsDeity = (choice.id === "cleric-alignment-1" || (!domainLevel && choice.id.startsWith("cleric-domain-"))) && !selectedDeity;
    const needsAlignment = choice.id === "cleric-channel-energy-type-1" && !selectedAlignment;
    const needsDomains = Boolean(domainLevel) && selectedDomains.length === 0;
    const unavailableDomainDetails = Boolean(domainLevel) && selectedDomains.length > 0 && options.length === 0;
    const unavailableSpecialistSpells = Boolean(specialistLevel) && Boolean(selectedWizardSchool) && !specialistUniversalist && options.length === 0;
    const selected = options.find((option) => option.id === selectedOptions[choice.id]);
    const usedKey = `${choice.id}-used`;
    const used = selectedOptions[usedKey] === "used";
    const placeholder = needsArcaneBond ? "Choose an arcane bond first" : wrongArcaneBond ? familiarChoice ? "Familiar bond not selected" : "Bonded object not selected" : needsHuntersBond ? "Choose Hunter's Bond first" : wrongHuntersBond ? "Animal Companion bond not selected" : needsWizardSchool ? "Choose an arcane school first" : specialistUniversalist ? "Universalists have no specialist slots" : wizardUniversalist ? "Universalists have no opposition schools" : needsDeity ? "Choose a deity first" : needsAlignment ? "Choose alignment first" : needsDomains ? "Choose domains first" : unavailableDomainDetails ? "Domain spell details unavailable" : unavailableSpecialistSpells ? "No matching specialist spells available" : options.length === 1 && choice.id === "cleric-channel-energy-type-1" ? "Determined by alignment" : "Choose an option";
    const disabled = needsArcaneBond || wrongArcaneBond || needsHuntersBond || wrongHuntersBond || needsWizardSchool || specialistUniversalist || wizardUniversalist || needsDeity || needsAlignment || needsDomains || unavailableDomainDetails || unavailableSpecialistSpells || (choice.id === "cleric-channel-energy-type-1" && options.length === 1);
    return <article className="choice-card" key={choice.id}><label>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => { onOptionChange(choice.id, event.target.value); if (trackedSpellSlot) onOptionChange(usedKey, ""); }} disabled={disabled}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id} disabled={!trackedSpellSlot && Object.entries(selectedOptions).some(([id, value]) => id !== choice.id && value === option.id)}>{option.name}</option>)}</select></label>{selected && <OptionDetails option={selected} />}{choice.id === "sorcerer-bloodline-1" && selected?.classSkillChoices && selected.classSkillChoices.length > 0 && <label>Bloodline class skill<select aria-label="Bloodline class skill choice" value={selectedOptions[bloodlineSkillKey] ?? ""} onChange={(event) => onOptionChange(bloodlineSkillKey, event.target.value)}><option value="">Choose a Knowledge skill</option>{selected.classSkillChoices.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>}{choice.id === "sorcerer-bloodline-1" && selected?.variants && selected.variants.length > 0 && <label>{isElementalBloodline ? "Element" : "Dragon type"}<select aria-label="Bloodline variant choice" value={selectedOptions[bloodlineVariantKey] ?? ""} onChange={(event) => onOptionChange(bloodlineVariantKey, event.target.value)}><option value="">{isElementalBloodline ? "Choose an element" : "Choose a dragon type"}</option>{selected.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>}{choice.id === "sorcerer-bloodline-1" && selectedBloodlineVariant && <p aria-label="Selected bloodline variant"><strong>{selectedBloodlineVariant.name}:</strong> {selectedBloodlineVariant.energyType}{variantDetail(selectedBloodlineVariant) && ` · ${variantDetail(selectedBloodlineVariant)}`}</p>}{choice.id === "cleric-channel-energy-type-1" && selected && <ChannelEnergyTracker level={classLevel} charismaModifier={charismaModifier} used={channelUsed} onUsedChange={(next) => onOptionChange(channelUsedKey, String(next))} />}{trackedSpellSlot && selected && <div className="domain-slot-use"><output aria-label={`${choice.name} status`}>{used ? "Used" : "Available"}</output><button type="button" aria-label={`Cast ${selected.name} from ${choice.name}`} disabled={used} onClick={() => onOptionChange(usedKey, "used")}>{used ? "Used" : "Cast prepared spell"}</button></div>}</article>;
  })}</section>;
}
