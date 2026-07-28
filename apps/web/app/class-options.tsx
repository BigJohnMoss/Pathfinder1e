import { useEffect } from "react";
import { spells as characterSpells, type CharacterSpell } from "./character-catalogue";
import { alignmentsWithinOneStep, channelEnergyChoices } from "../../../packages/engine/src/cleric-alignment.js";
import { channelEnergyProgression } from "../../../packages/engine/src/channel-energy.js";
import { optionsGrantedBySelection } from "../../../packages/engine/src/dependent-options.js";
import { arcaneBondDetailOptions } from "../../../packages/engine/src/wizard-arcane-bond.js";
import { oppositionSchoolOptions } from "../../../packages/engine/src/wizard-schools.js";
import { specialistSchoolSpells } from "../../../packages/engine/src/wizard-specialist-slots.js";
import type { CharacterOption } from "../../../packages/types/src/index.js";

type BloodlineVariant = NonNullable<CharacterOption["variants"]>[number];
type Option = Pick<CharacterOption, "id" | "name" | "benefit"> & Partial<Omit<CharacterOption, "id" | "name" | "benefit">>;
type Choice = { id: string; name: string; level: number; classLevel?: number; options: Option[]; selected?: Option; requiredOptionId?: string; requiredOptionMessage?: string };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const domainSpellLevel = (choice: Choice) => Number(choice.id.match(/^(?:cleric|druid|sacred-servant)-domain-spell-(\d+)$/)?.[1] ?? 0);
const specialistSpellLevel = (choice: Choice) => Number(choice.id.match(/^wizard-specialist-spell-(\d+)$/)?.[1] ?? 0);
const isWizardOpposition = (choice: Choice) => choice.id.startsWith("wizard-opposition-school-");
const isPaladinMercy = (choice: Choice) => choice.id.startsWith("paladin-mercy-");
const isOracleRevelation = (choice: Choice) => choice.id.startsWith("oracle-revelation-");
const choiceOrder = (choice: Choice) => {
  if (choice.id === "wizard-arcane-bond-1") return 5;
  if (choice.id === "wizard-familiar-1" || choice.id === "wizard-bonded-object-1") return 6;
  if (choice.id === "cleric-deity-1" || choice.id === "sacred-servant-deity-1" || choice.id === "wizard-arcane-school-1" || choice.id === "sorcerer-bloodline-1") return 10;
  if (choice.id === "paladin-divine-bond-5") return 11;
  if (choice.id === "cleric-alignment-1" || choice.id === "wizard-opposition-school-1-first") return 20;
  if (choice.id === "wizard-opposition-school-1-second") return 21;
  const specialistLevel = specialistSpellLevel(choice);
  if (specialistLevel) return 30 + specialistLevel;
  if (choice.id === "cleric-channel-energy-type-1") return 30;
  if (choice.id === "cleric-domain-1-first" || choice.id === "sacred-servant-domain-4") return 40;
  if (choice.id === "cleric-domain-1-second") return 41;
  const domainLevel = domainSpellLevel(choice);
  return domainLevel ? 50 + domainLevel : 100;
};

const variantDetail = (variant: BloodlineVariant) => variant.breathShape ?? variant.movement ?? "";

function OptionDetails({ option }: { option: Option }) {
  const bloodline = Boolean(option.arcana || option.bonusSpells || option.bonusFeats || option.classSkill);
  return <div className="option-details">
    <p>{option.benefit}</p>
    {option.parentDomainId && <p><strong>Associated domain:</strong> {option.parentDomainId.replace(/^domain-/, "").replace(/-/g, " ")}</p>}
    {option.replacesPower && <p><strong>Replaces:</strong> {option.replacesPower}</p>}
    {option.classSkills && option.classSkills.length > 0 && <p><strong>Granted class skills:</strong> {option.classSkills.join(", ")}</p>}
    {option.classSkill && <p><strong>Bloodline class skill:</strong> {option.classSkill}</p>}
    {option.arcana && <p><strong>Bloodline arcana:</strong> {option.arcana}</p>}
    {option.variants && <div className="domain-powers"><strong>Bloodline variants</strong><ul>{option.variants.map((variant) => <li key={variant.id}><b>{variant.name}</b><span>{variant.energyType}{variantDetail(variant) && ` \u00b7 ${variantDetail(variant)}`}</span></li>)}</ul></div>}
    {option.powers && <div className="domain-powers"><strong>{bloodline ? "Bloodline powers" : "Granted powers"}</strong><ul>{option.powers.map((power) => <li key={`${power.level}-${power.name}`}><b>{power.name}</b> <small>level {power.level}</small><span>{power.summary}</span></li>)}</ul></div>}
    {option.bonusSpells && <div className="domain-spells"><strong>Bloodline bonus spells</strong><ol>{option.bonusSpells.map((spell) => <li key={spell.sorcererLevel}><b>{spell.sorcererLevel}</b><span>{spell.name} <small>spell level {spell.spellLevel}</small></span></li>)}</ol></div>}
    {option.bonusFeats && <div className="domain-powers"><strong>Bloodline bonus feats</strong><ul>{option.bonusFeats.map((feat) => <li key={feat}><span>{feat}</span></li>)}</ul></div>}
    {option.revelations && <div className="domain-powers"><strong>Revelations</strong><ul>{option.revelations.map((revelation) => <li key={revelation.id}><b>{revelation.name}</b> <small>level {revelation.minimumLevel}</small><span>{revelation.summary}</span></li>)}</ul></div>}
    {option.mysterySpells && <div className="domain-spells"><strong>Mystery spells</strong><ol>{option.mysterySpells.map((spell) => <li key={spell.oracleLevel}><b>{spell.oracleLevel}</b><span>{spell.name} <small>spell level {spell.spellLevel}</small></span></li>)}</ol></div>}
    {option.finalRevelation && <p><strong>Final revelation:</strong> {option.finalRevelation}</p>}
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

function BeastMasterRoster({ choice, selectedOptions, classLevel, onOptionChange }: { choice: Choice; selectedOptions: Record<string, string>; classLevel: number; onOptionChange: (featureId: string, optionId: string) => void }) {
  const budget = classLevel >= 12 ? classLevel : Math.max(1, classLevel - 3);
  const key = (index: number, field: "companion" | "level") => `${choice.id}-${index}-${field}`;
  const entries = Array.from({ length: budget }, (_, index) => ({
    index,
    companionId: selectedOptions[key(index, "companion")] ?? "",
    level: Math.max(0, Number.parseInt(selectedOptions[key(index, "level")] ?? "0", 10) || 0)
  })).filter((entry) => entry.companionId);
  const allocated = entries.reduce((total, entry) => total + entry.level, 0);
  const nextIndex = Array.from({ length: budget }, (_, index) => index).find((index) => !selectedOptions[key(index, "companion")]);

  useEffect(() => {
    let remaining = budget;
    for (let index = 0; index < 20; index += 1) {
      const companionKey = key(index, "companion");
      const levelKey = key(index, "level");
      const companionId = selectedOptions[companionKey];
      if (index >= budget) {
        if (companionId) onOptionChange(companionKey, "");
        if (selectedOptions[levelKey]) onOptionChange(levelKey, "");
        continue;
      }
      if (!companionId) {
        if (selectedOptions[levelKey]) onOptionChange(levelKey, "");
        continue;
      }
      const current = Math.max(1, Number.parseInt(selectedOptions[levelKey] ?? "1", 10) || 1);
      const normalized = Math.min(current, remaining);
      if (String(normalized) !== selectedOptions[levelKey]) onOptionChange(levelKey, String(normalized));
      remaining -= normalized;
      if (remaining <= 0) {
        for (let later = index + 1; later < 20; later += 1) {
          if (selectedOptions[key(later, "companion")]) onOptionChange(key(later, "companion"), "");
          if (selectedOptions[key(later, "level")]) onOptionChange(key(later, "level"), "");
        }
        break;
      }
    }
  }, [budget, choice.id, selectedOptions, onOptionChange]);

  const row = (index: number, companionId: string, level: number) => {
    const otherAllocated = allocated - level;
    const maximum = Math.max(1, budget - otherAllocated);
    return <div className="beast-master-companion" key={index}>
      <label>Companion {index + 1}<select aria-label={`Beast Master companion ${index + 1}`} value={companionId} onChange={(event) => { onOptionChange(key(index, "companion"), event.target.value); onOptionChange(key(index, "level"), event.target.value ? "1" : ""); }}><option value="">Choose a companion</option>{choice.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      {companionId && <label>Effective Druid levels<select aria-label={`Beast Master companion ${index + 1} effective levels`} value={level || 1} onChange={(event) => onOptionChange(key(index, "level"), event.target.value)}>{Array.from({ length: maximum }, (_, value) => value + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
      {companionId && <button type="button" onClick={() => { onOptionChange(key(index, "companion"), ""); onOptionChange(key(index, "level"), ""); }}>Remove companion {index + 1}</button>}
    </div>;
  };

  return <article className="choice-card beast-master-roster"><h3>{choice.name} <small>level {choice.level}</small></h3><p>Allocate up to {budget} effective Druid level{budget === 1 ? "" : "s"} across any number of companions.</p><output aria-label="Beast Master allocation">{allocated}/{budget} levels allocated</output>{entries.map((entry) => row(entry.index, entry.companionId, entry.level))}{nextIndex !== undefined && allocated < budget && row(nextIndex, "", 0)}</article>;
}

const spellAsOption = (spell: CharacterSpell, schoolName: string): Option => ({
  id: spell.id,
  name: spell.name,
  benefit: `Prepare ${spell.name} in this dedicated ${schoolName} specialist slot. ${spell.summary}`
});

export function ClassOptions({ choices, selectedOptions, classLevel, charismaModifier, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; classLevel: number; charismaModifier: number; onOptionChange: (featureId: string, optionId: string) => void }) {
  const orderedChoices = [...choices].sort((left, right) => choiceOrder(left) - choiceOrder(right));
  const selectedDeity = orderedChoices.find((choice) => choice.id === "cleric-deity-1" || choice.id === "sacred-servant-deity-1")?.selected;
  const selectedAlignment = orderedChoices.find((choice) => choice.id === "cleric-alignment-1")?.selected;
  const selectedArcaneBond = orderedChoices.find((choice) => choice.id === "wizard-arcane-bond-1")?.selected;
  const selectedHuntersBond = orderedChoices.find((choice) => choice.id === "ranger-hunters-bond-4")?.selected;
  const selectedNatureBond = orderedChoices.find((choice) => choice.id === "druid-nature-bond-1")?.selected;
  const selectedWizardSchool = orderedChoices.find((choice) => choice.id === "wizard-arcane-school-1")?.selected;
  const selectedSorcererBloodline = orderedChoices.find((choice) => choice.id === "sorcerer-bloodline-1")?.selected;
  const selectedOracleMystery = orderedChoices.find((choice) => choice.id === "oracle-mystery-1")?.selected;
  const selectedDomains = orderedChoices.filter((choice) => choice.id === "cleric-domain-1-first" || choice.id === "cleric-domain-1-second" || choice.id === "druid-domain-1" || choice.id === "sacred-servant-domain-4").flatMap((choice) => choice.selected ? [choice.selected] : []);
  const domainSlotChoices = orderedChoices.filter((choice) => domainSpellLevel(choice) > 0);
  const specialistSlotChoices = orderedChoices.filter((choice) => specialistSpellLevel(choice) > 0);
  const bloodlineSkillKey = "sorcerer-bloodline-class-skill";
  const bloodlineSkillChoices = selectedSorcererBloodline?.classSkillChoices ?? [];
  const bloodlineVariantKey = "sorcerer-bloodline-variant";
  const bloodlineVariants = selectedSorcererBloodline?.variants ?? [];
  const selectedBloodlineVariant = bloodlineVariants.find((variant) => variant.id === selectedOptions[bloodlineVariantKey]);
  const isElementalBloodline = selectedSorcererBloodline?.id === "sorcerer-bloodline-elemental";
  const channelUsedKey = "cleric-channel-energy-used";
  const channelClassLevel = orderedChoices.find((choice) => choice.id === "cleric-channel-energy-type-1")?.classLevel ?? classLevel;
  const channelProgression = channelEnergyProgression(channelClassLevel, charismaModifier);
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
    if (isOracleRevelation(choice)) {
      const selectedOptionIds = Object.values(selectedOptions);
      const selectedByOtherRevelation = orderedChoices
        .filter((other) => other.id !== choice.id && isOracleRevelation(other))
        .map((other) => selectedOptions[other.id])
        .filter((id): id is string => Boolean(id));
      return choice.options.filter((option) =>
        option.mysteryId === selectedOracleMystery?.id
        && !selectedByOtherRevelation.includes(option.id)
        && !option.incompatibleOptionIds?.some((id) => selectedOptionIds.includes(id))
      );
    }
    const specialistLevel = specialistSpellLevel(choice);
    if (specialistLevel) return specialistOptions(specialistLevel);
    if (isWizardOpposition(choice)) return oppositionSchoolOptions(choice.options, selectedWizardSchool);
    const domainLevel = domainSpellLevel(choice);
    if (domainLevel) return domainSpellOptions(domainLevel);
    if (choice.id === "druid-domain-1") return choice.options;
    if (choice.id === "sacred-servant-domain-4") return optionsGrantedBySelection(choice.options, selectedDeity);
    if (!choice.id.startsWith("cleric-domain-")) return choice.options;
    return optionsGrantedBySelection(choice.options, selectedDeity);
  };
  const optionSelectionLimit = (option: Option) => option.selectionLimit ?? (option.repeatable ? Number.POSITIVE_INFINITY : 1);
  const selectedByOtherChoices = (choice: Choice, option: Option) => orderedChoices
    .filter((other) => other.id !== choice.id && other.selected?.id === option.id)
    .length;
  const conflictsWithSelectedFamily = (choice: Choice, option: Option) => Boolean(option.exclusiveGroupId && orderedChoices.some((other) =>
    other.id !== choice.id
    && other.selected?.exclusiveGroupId === option.exclusiveGroupId
    && other.selected?.familyId !== option.familyId
  ));

  useEffect(() => {
    const seenMercies = new Set<string>();
    const seenUniqueDetails = new Set<string>();
    for (const choice of orderedChoices) {
      const selectedId = selectedOptions[choice.id];
      if ((isPaladinMercy(choice) || isOracleRevelation(choice)) && selectedId) {
        if (seenMercies.has(selectedId)) {
          onOptionChange(choice.id, "");
          continue;
        }
        seenMercies.add(selectedId);
      }
      const options = optionsFor(choice);
      if (choice.id === "wizard-opposition-school-1-first" && selectedWizardSchool?.elementalOppositionSchool && options.length === 1 && selectedId !== options[0].id) {
        onOptionChange(choice.id, options[0].id);
        continue;
      }
      if (choice.id === "wizard-opposition-school-1-second" && selectedWizardSchool?.elementalOppositionSchool && selectedId) {
        onOptionChange(choice.id, "");
        continue;
      }
      if (selectedId && !options.some((option) => option.id === selectedId)) onOptionChange(choice.id, "");
      const selectedOption = options.find((option) => option.id === selectedId);
      if (selectedOption?.choice) {
        const detailKey = `${choice.id}-${selectedOption.choice.key}`;
        const detailValue = selectedOptions[detailKey];
        if (detailValue && !selectedOption.choice.options.some((option) => option.id === detailValue)) onOptionChange(detailKey, "");
        if (detailValue && selectedOption.choice.uniqueAcrossSelections) {
          const uniqueKey = `${selectedOption.id}:${selectedOption.choice.key}:${detailValue}`;
          if (seenUniqueDetails.has(uniqueKey)) onOptionChange(detailKey, "");
          else seenUniqueDetails.add(uniqueKey);
        }
      }
      if (choice.id === "cleric-channel-energy-type-1" && options.length === 1 && selectedId !== options[0].id) onOptionChange(choice.id, options[0].id);
      if (!selectedId && (domainSpellLevel(choice) || specialistSpellLevel(choice)) && selectedOptions[`${choice.id}-used`]) onOptionChange(`${choice.id}-used`, "");
    }
    const selectedBloodlineSkill = selectedOptions[bloodlineSkillKey];
    if (selectedBloodlineSkill && !bloodlineSkillChoices.includes(selectedBloodlineSkill)) onOptionChange(bloodlineSkillKey, "");
    const selectedVariantId = selectedOptions[bloodlineVariantKey];
    if (selectedVariantId && !bloodlineVariants.some((variant) => variant.id === selectedVariantId)) onOptionChange(bloodlineVariantKey, "");
    if (channelUsed > channelProgression.usesPerDay) onOptionChange(channelUsedKey, String(channelProgression.usesPerDay));
  }, [choices, selectedDeity?.id, selectedAlignment?.id, selectedArcaneBond?.id, selectedHuntersBond?.id, selectedNatureBond?.id, selectedWizardSchool?.id, selectedSorcererBloodline?.id, selectedOracleMystery?.id, selectedOptions, classLevel, charismaModifier, onOptionChange]);

  const refreshDomainSlots = () => domainSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));
  const refreshSpecialistSlots = () => specialistSlotChoices.forEach((choice) => onOptionChange(`${choice.id}-used`, ""));

  return <section className="choice-panel"><div><p className="eyebrow">FEATURE CHOICES</p><h2>Configure class features</h2><p>Dependent choices are ordered so each selection unlocks the next legal options.</p></div>{domainSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshDomainSlots}>Refresh domain spell slots</button>}{specialistSlotChoices.length > 0 && <button type="button" className="domain-slot-refresh" onClick={refreshSpecialistSlots}>Refresh specialist school slots</button>}{orderedChoices.map((choice) => {
    if (choice.id === "beast-master-companion-roster-4") return <BeastMasterRoster key={choice.id} choice={choice} selectedOptions={selectedOptions} classLevel={choice.classLevel ?? classLevel} onOptionChange={onOptionChange} />;
    const options = optionsFor(choice);
    const domainLevel = domainSpellLevel(choice);
    const specialistLevel = specialistSpellLevel(choice);
    const trackedSpellSlot = Boolean(domainLevel || specialistLevel);
    const wizardOpposition = isWizardOpposition(choice);
    const specialistUniversalist = Boolean(specialistLevel) && selectedWizardSchool?.id === "wizard-school-universalist";
    const wizardUniversalist = wizardOpposition && selectedWizardSchool?.id === "wizard-school-universalist";
    const elementalSecondOpposition = choice.id === "wizard-opposition-school-1-second" && Boolean(selectedWizardSchool?.elementalOppositionSchool);
    const needsWizardSchool = (wizardOpposition || Boolean(specialistLevel)) && !selectedWizardSchool;
    const familiarChoice = choice.id === "wizard-familiar-1";
    const objectChoice = choice.id === "wizard-bonded-object-1";
    const companionChoice = choice.id === "ranger-animal-companion-4";
    const druidCompanionChoice = choice.id === "druid-animal-companion-1";
    const druidDomainChoice = choice.id === "druid-domain-1";
    const druidDomainSlot = choice.id.startsWith("druid-domain-spell-");
    const needsArcaneBond = (familiarChoice || objectChoice) && !selectedArcaneBond;
    const wrongArcaneBond = (familiarChoice && selectedArcaneBond?.id === "wizard-arcane-bond-object") || (objectChoice && selectedArcaneBond?.id === "wizard-arcane-bond-familiar");
    const needsHuntersBond = companionChoice && !selectedHuntersBond;
    const wrongHuntersBond = companionChoice && selectedHuntersBond?.id !== "ranger-hunters-bond-animal";
    const needsNatureBond = (druidCompanionChoice || druidDomainChoice || druidDomainSlot) && !selectedNatureBond;
    const hasDomainNatureBond = selectedNatureBond?.id?.endsWith("nature-bond-domain") ?? false;
    const wrongNatureBond = (druidCompanionChoice && selectedNatureBond?.id !== "druid-nature-bond-animal") || ((druidDomainChoice || druidDomainSlot) && !hasDomainNatureBond);
    const needsDeity = (choice.id === "cleric-alignment-1" || choice.id === "sacred-servant-domain-4" || (!domainLevel && choice.id.startsWith("cleric-domain-"))) && !selectedDeity;
    const needsAlignment = choice.id === "cleric-channel-energy-type-1" && !selectedAlignment;
    const needsDomains = Boolean(domainLevel) && selectedDomains.length === 0;
    const needsOracleMystery = isOracleRevelation(choice) && !selectedOracleMystery;
    const needsRequiredOption = Boolean(choice.requiredOptionId && !Object.values(selectedOptions).includes(choice.requiredOptionId));
    const unavailableDomainDetails = Boolean(domainLevel) && selectedDomains.length > 0 && options.length === 0;
    const unavailableSpecialistSpells = Boolean(specialistLevel) && Boolean(selectedWizardSchool) && !specialistUniversalist && options.length === 0;
    const selected = options.find((option) => option.id === selectedOptions[choice.id]);
    const usedKey = `${choice.id}-used`;
    const used = selectedOptions[usedKey] === "used";
    const placeholder = needsRequiredOption ? choice.requiredOptionMessage ?? "Choose the prerequisite option first" : needsArcaneBond ? "Choose an arcane bond first" : wrongArcaneBond ? familiarChoice ? "Familiar bond not selected" : "Bonded object not selected" : needsHuntersBond ? "Choose Hunter's Bond first" : wrongHuntersBond ? "Animal Companion bond not selected" : needsNatureBond ? "Choose Nature Bond first" : wrongNatureBond ? druidCompanionChoice ? "Animal Companion bond not selected" : "Nature Domain bond not selected" : needsWizardSchool ? "Choose an arcane school first" : specialistUniversalist ? "Universalists have no specialist slots" : wizardUniversalist ? "Universalists have no opposition schools" : elementalSecondOpposition ? "Elementalists choose one opposition element" : needsOracleMystery ? "Choose a mystery first" : needsDeity ? "Choose a deity first" : needsAlignment ? "Choose alignment first" : needsDomains ? "Choose domains first" : unavailableDomainDetails ? "Domain spell details unavailable" : unavailableSpecialistSpells ? "No matching specialist spells available" : options.length === 1 && choice.id === "cleric-channel-energy-type-1" ? "Determined by alignment" : "Choose an option";
    const disabled = needsRequiredOption || needsArcaneBond || wrongArcaneBond || needsHuntersBond || wrongHuntersBond || needsNatureBond || wrongNatureBond || needsWizardSchool || specialistUniversalist || wizardUniversalist || elementalSecondOpposition || needsOracleMystery || needsDeity || needsAlignment || needsDomains || unavailableDomainDetails || unavailableSpecialistSpells || (choice.id === "cleric-channel-energy-type-1" && options.length === 1);
    const domainEquivalent = (option: Option) => option.parentDomainId ?? option.id;
    const domainSelection = choice.id.startsWith("cleric-domain-") || choice.id === "druid-domain-1" || choice.id === "sacred-servant-domain-4";
    const detailKey = selected?.choice ? `${choice.id}-${selected.choice.key}` : "";
    const usedDetailValues = selected?.choice?.uniqueAcrossSelections ? orderedChoices.filter((other) => other.id !== choice.id && other.selected?.id === selected.id).map((other) => selectedOptions[`${other.id}-${selected.choice!.key}`]).filter(Boolean) : [];
    return <article className="choice-card" key={choice.id}><label>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => { if (selected?.choice) onOptionChange(detailKey, ""); onOptionChange(choice.id, event.target.value); if (trackedSpellSlot) onOptionChange(usedKey, ""); }} disabled={disabled}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id} disabled={!trackedSpellSlot && (domainSelection ? orderedChoices.some((other) => other.id !== choice.id && other.selected && domainEquivalent(other.selected) === domainEquivalent(option)) : conflictsWithSelectedFamily(choice, option) || selectedByOtherChoices(choice, option) >= optionSelectionLimit(option))}>{option.name}</option>)}</select></label>{selected && <OptionDetails option={selected} />}{selected?.choice && <label>{selected.choice.label}<select aria-label={`${choice.name} ${selected.choice.label}`} value={selectedOptions[detailKey] ?? ""} onChange={(event) => onOptionChange(detailKey, event.target.value)}><option value="">Choose {selected.choice.label.toLowerCase()}</option>{selected.choice.options.map((option) => <option key={option.id} value={option.id} disabled={usedDetailValues.includes(option.id)}>{option.name}</option>)}</select></label>}{choice.id === "sorcerer-bloodline-1" && selected?.classSkillChoices && selected.classSkillChoices.length > 0 && <label>Bloodline class skill<select aria-label="Bloodline class skill choice" value={selectedOptions[bloodlineSkillKey] ?? ""} onChange={(event) => onOptionChange(bloodlineSkillKey, event.target.value)}><option value="">Choose a Knowledge skill</option>{selected.classSkillChoices.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>}{choice.id === "sorcerer-bloodline-1" && selected?.variants && selected.variants.length > 0 && <label>{isElementalBloodline ? "Element" : "Dragon type"}<select aria-label="Bloodline variant choice" value={selectedOptions[bloodlineVariantKey] ?? ""} onChange={(event) => onOptionChange(bloodlineVariantKey, event.target.value)}><option value="">{isElementalBloodline ? "Choose an element" : "Choose a dragon type"}</option>{selected.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>}{choice.id === "sorcerer-bloodline-1" && selectedBloodlineVariant && <p aria-label="Selected bloodline variant"><strong>{selectedBloodlineVariant.name}:</strong> {selectedBloodlineVariant.energyType}{variantDetail(selectedBloodlineVariant) && ` \u00b7 ${variantDetail(selectedBloodlineVariant)}`}</p>}{choice.id === "cleric-channel-energy-type-1" && selected && <ChannelEnergyTracker level={choice.classLevel ?? classLevel} charismaModifier={charismaModifier} used={channelUsed} onUsedChange={(next) => onOptionChange(channelUsedKey, String(next))} />}{trackedSpellSlot && selected && <div className="domain-slot-use"><output aria-label={`${choice.name} status`}>{used ? "Used" : "Available"}</output><button type="button" aria-label={`Cast ${selected.name} from ${choice.name}`} disabled={used} onClick={() => onOptionChange(usedKey, "used")}>{used ? "Used" : "Cast prepared spell"}</button></div>}</article>;
  })}</section>;
}
