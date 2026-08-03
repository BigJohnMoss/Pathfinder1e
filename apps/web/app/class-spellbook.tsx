"use client";

import { useEffect, useMemo } from "react";
import { optionGroups } from "./character-catalogue";
import { Spellbook } from "./spellbook";
import { classSpellAutomation } from "./archetype-spell-automation";
import { SpontaneousSpellbook } from "./spontaneous-spellbook";
import { abilityModifiers as calculateAbilityModifiers, arcaneReservoir, normalizeSpellSlotUses, spellSaveDC, spellcastingProgression, spellsAvailableToClass } from "../../../packages/engine/src/index.js";
import { normalizePreparedSpellsWithOpposition } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../../../packages/engine/src/spontaneous-spellcasting.js";
import { bloodlineBonusSpells } from "../../../packages/engine/src/sorcerer-bloodlines.js";
import { mysteryBonusSpells } from "../../../packages/engine/src/oracle-mysteries.js";
import type { AbilityScores, ActiveEffect, CharacterClass, CharacterOption, CharacterSpell } from "../../../packages/types/src/index.js";

type SpellTraitBonuses = Record<string, { casterLevel: number; metamagicLevelAdjustment: number }>;

const abilityLabels = { intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" } as const;
const wizardOppositionFeatureIds = ["wizard-opposition-school-1-first", "wizard-opposition-school-1-second"];
const schoolSavantOppositionFeatureIds = ["school-savant-opposition-school-1-first", "school-savant-opposition-school-1-second"];

function selectedOption(classId: string, groupId: string, featureId: string, selectedOptions: Record<string, string>) {
  if (!classId) return undefined;
  return optionGroups.find((group) => group.id === groupId)?.options.find((option) => option.id === selectedOptions[featureId]) as CharacterOption | undefined;
}

function mergeSpellLists(baseSpells: CharacterSpell[], grantedSpells: CharacterSpell[]) {
  const byId = new Map(baseSpells.map((spell) => [spell.id, spell]));
  for (const spell of grantedSpells) byId.set(spell.id, spell);
  return [...byId.values()];
}

const signatureSpellOption = (spell: CharacterSpell): CharacterOption => ({
  id: `spell-specialist-signature-spells-${spell.id}`,
  name: spell.name,
  groupId: "spell-specialist-signature-spells",
  classIds: ["arcanist"],
  minimumLevel: 1,
  prerequisites: [],
  benefit: `Cast ${spell.name} as a signature spell without preparing it. ${spell.summary}`,
  spellId: spell.id,
  spellLevel: spell.levelByClass.arcanist,
  castsAsPrepared: true,
  preparedCapacityCost: 1,
  spellSaveDcBonus: 1,
  concentrationBonus: { base: 2, improvedAtLevel: 10, improved: 4 },
  source: { title: "Advanced Class Guide", page: 78, url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Arcanist%20Spell%20Specialist" },
});

export function ClassSpellbook({
  characterClass,
  spells,
  classLevel,
  abilities,
  selectedOptions,
  spellTraitBonuses = {},
  selectedSpellIds,
  onSelectedSpellIdsChange,
  slotUses,
  onSlotUsesChange,
  reservoirPoints,
  onReservoirPointsChange,
  onAddEffect,
}: {
  characterClass: CharacterClass;
  spells: CharacterSpell[];
  classLevel: number;
  abilities: AbilityScores;
  selectedOptions: Record<string, string>;
  spellTraitBonuses?: SpellTraitBonuses;
  selectedSpellIds: string[];
  onSelectedSpellIdsChange: (spellIds: string[]) => void;
  slotUses: Record<number, number>;
  onSlotUsesChange: (uses: Record<number, number>) => void;
  reservoirPoints: number;
  onReservoirPointsChange: (points: number) => void;
  onAddEffect?: (effect: ActiveEffect) => void;
}) {
  const spellcasting = characterClass.spellcasting;
  const castingAbility = spellcasting?.ability ?? "intelligence";
  const abilityScore = abilities[castingAbility];
  const spontaneous = spellcasting?.castingType === "spontaneous";
  const preparedCasting = useMemo(() => spellcasting && !spontaneous ? spellcastingProgression(characterClass, classLevel, { abilityScore }) : null, [abilityScore, characterClass, classLevel, spellcasting, spontaneous]);
  const spontaneousCasting = useMemo(() => spellcasting && spontaneous ? spontaneousSpellcastingProgression(characterClass, classLevel, { abilityScore }) : null, [abilityScore, characterClass, classLevel, spellcasting, spontaneous]);
  const casting = spontaneousCasting ?? preparedCasting;
  const maximumSpellLevel = casting?.maximumSpellLevel ?? 0;
  const spellListClassId = characterClass.spellListClassId ?? characterClass.id;
  const baseSpells = useMemo(() => casting ? spellsAvailableToClass(spells, spellListClassId, maximumSpellLevel, characterClass.spellListAdditions) : [], [casting, characterClass.spellListAdditions, maximumSpellLevel, spellListClassId, spells]);
  const bloodline = selectedOption(characterClass.id, "sorcerer-bloodlines", "sorcerer-bloodline-1", selectedOptions);
  const mystery = selectedOption(characterClass.id, "oracle-mysteries", "oracle-mystery-1", selectedOptions);
  const wizardSchool = selectedOption(characterClass.id, "wizard-schools", "wizard-arcane-school-1", selectedOptions);
  const elementalMaster = characterClass.features.some((feature) => feature.id === "arcanist-elemental-master-elemental-focus-su-1");
  const elementalMasterElement = elementalMaster
    ? selectedOption(characterClass.id, "elemental-master-elements", "arcanist-elemental-master-elemental-focus-su-1", selectedOptions)
    : undefined;
  const spellOptions = useMemo(() => [
    ...Object.entries(selectedOptions).flatMap(([featureId, optionId]) => {
      const option = optionGroups.flatMap((group) => group.options).find((candidate) => candidate.id === optionId);
      if (option) return [option];
      if (featureId.startsWith("arcanist-spell-specialist-signature-spells-") && optionId.startsWith("spell-specialist-signature-spells-")) {
        const spell = spells.find((candidate) => `spell-specialist-signature-spells-${candidate.id}` === optionId);
        return spell ? [signatureSpellOption(spell)] : [];
      }
      return [];
    }),
    ...characterClass.features
      .filter((feature) => feature.level <= classLevel && feature.grantsAllOptions && feature.optionGroupId)
      .flatMap((feature) => optionGroups.find((group) => group.id === feature.optionGroupId)?.options ?? [])
      .filter((option) => option.minimumLevel <= classLevel),
  ].filter((option) => option.spellId && option.classIds.includes(characterClass.id)), [characterClass.features, characterClass.id, classLevel, selectedOptions, spells]);
  const grantedSpells = useMemo(() => characterClass.id === "sorcerer" && casting
    ? bloodlineBonusSpells(spells, bloodline, classLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
    : characterClass.id === "oracle" && casting
      ? mysteryBonusSpells(spells, mystery, classLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
      : [], [bloodline, casting, characterClass.id, classLevel, maximumSpellLevel, mystery]);
  const optionSpells = useMemo(() => spellOptions.flatMap((option) => {
    const spell = spells.find((candidate) => candidate.id === option.spellId);
    return spell && option.spellLevel !== undefined && (option.ignoresMaximumSpellLevel || option.spellLevel <= maximumSpellLevel)
      ? [{ ...spell, levelByClass: { ...spell.levelByClass, [characterClass.id]: option.spellLevel } }]
      : [];
  }), [characterClass.id, maximumSpellLevel, spellOptions, spells]);
  const availableSpells = useMemo(() => mergeSpellLists(baseSpells, [...grantedSpells, ...optionSpells]), [baseSpells, grantedSpells, optionSpells]);
  const onDemandSpellCosts = useMemo(() => Object.fromEntries(spellOptions.flatMap((option) => {
    if (!option?.castsAsPrepared || !option.spellId || !option.classIds.includes(characterClass.id)) return [];
    const resource = option.resourceCost;
    const cost = !resource || classLevel >= (resource.freeAtClassLevel ?? Number.POSITIVE_INFINITY) ? 0 : Math.max(resource.minimum ?? 0, (resource.base ?? 0) + (resource.levelDivisor ? Math.floor((option.spellLevel ?? 0) / resource.levelDivisor) : 0));
    const concentrationBonus = classLevel >= (option.concentrationBonus?.improvedAtLevel ?? Number.POSITIVE_INFINITY) ? option.concentrationBonus?.improved ?? option.concentrationBonus?.base ?? 0 : option.concentrationBonus?.base ?? 0;
    return [[option.spellId, { resourceId: resource?.resourceId, cost, label: resource?.label ?? "Signature Spell", consumesSpellSlot: resource?.consumesSpellSlot ?? true, saveDcBonus: option.spellSaveDcBonus ?? 0, concentrationBonus }]];
  })), [characterClass.id, classLevel, spellOptions]);
  const grantedSpellIds = useMemo(() => grantedSpells.map((spell) => spell.id), [grantedSpells]);
  const oppositionSchoolIds = useMemo(() => {
    const featureIds = characterClass.id === "wizard" ? wizardOppositionFeatureIds : characterClass.id === "arcanist" ? schoolSavantOppositionFeatureIds : [];
    return featureIds.map((featureId) => selectedOptions[featureId]).filter((id): id is string => Boolean(id));
  }, [characterClass.id, selectedOptions]);
  const oppositionSpellIds = useMemo(() => {
    const oppositionElementId = characterClass.id === "wizard" ? wizardSchool?.elementalOppositionSchool : elementalMasterElement?.elementalOppositionSchool;
    if (!oppositionElementId) return [];
    const oppositionElement = optionGroups.find((group) => group.id === "wizard-schools")?.options
      .find((option) => option.id === `wizard-school-${oppositionElementId}`);
    return Object.values(oppositionElement?.elementalSpellIdsByLevel ?? {}).flat();
  }, [characterClass.id, elementalMasterElement?.elementalOppositionSchool, wizardSchool?.elementalOppositionSchool]);
  const restrictedBonus = useMemo(() => elementalMasterElement ? {
    eligibleSpellIds: Object.values(elementalMasterElement.elementalSpellIdsByLevel ?? {}).flat(),
    countPerLevel: 1,
    label: `${elementalMasterElement.name} bonus slot`,
  } : null, [elementalMasterElement]);
  const preparedCapacityCosts = spellOptions.reduce<Record<number, number>>((costs, option) => {
    if (option.preparedCapacityCost && option.spellLevel !== undefined) costs[option.spellLevel] = (costs[option.spellLevel] ?? 0) + option.preparedCapacityCost;
    return costs;
  }, {});
  const preparedLimits = (preparedCasting?.prepared ?? []).map((entry) => ({ ...entry, count: Math.max(0, entry.count - (preparedCapacityCosts[entry.level] ?? 0)) }));
  const limits = spontaneousCasting?.known ?? preparedLimits;
  const slots = casting?.slots ?? [];
  const spellDcs = casting ? Object.fromEntries(Array.from({ length: Math.max(maximumSpellLevel, ...spellOptions.map((option) => option.spellLevel ?? 0)) + 1 }, (_, spellLevel) => [spellLevel, spellSaveDC(abilityScore, spellLevel)])) : {};
  const reservoir = characterClass.id === "arcanist" ? arcaneReservoir(classLevel) : null;
  const requiredSchool = characterClass.features.some((feature) => feature.id === "arcanist-twilight-sage-necromantic-focus-ex-1") ? "necromancy" : undefined;
  const normalizeSelections = (spellIds: string[]) => spontaneous
    ? normalizeKnownSpells(spellIds, availableSpells, spellListClassId, limits, grantedSpellIds)
    : normalizePreparedSpellsWithOpposition(spellIds.filter((id) => !onDemandSpellCosts[id]), availableSpells, spellListClassId, limits, oppositionSchoolIds, oppositionSpellIds, restrictedBonus, requiredSchool);

  useEffect(() => {
    const next = normalizeSelections(selectedSpellIds);
    if (next.length !== selectedSpellIds.length || next.some((id, index) => id !== selectedSpellIds[index])) onSelectedSpellIdsChange(next);
  }, [availableSpells, characterClass.id, grantedSpellIds, limits, oppositionSchoolIds, oppositionSpellIds, selectedSpellIds, spontaneous]);
  useEffect(() => {
    const next = normalizeSpellSlotUses(slotUses, slots);
    if (Object.keys(next).length !== Object.keys(slotUses).length || Object.entries(next).some(([level, used]) => slotUses[Number(level)] !== used)) onSlotUsesChange(next);
  }, [slotUses, slots]);
  useEffect(() => {
    if (reservoir && reservoirPoints > reservoir.maximum) onReservoirPointsChange(reservoir.maximum);
  }, [reservoir?.maximum, reservoirPoints]);

  if (!casting) return null;
  const refreshDay = () => {
    onSlotUsesChange({});
    if (reservoir) onReservoirPointsChange(reservoir.dailyRefresh);
  };
  if (spontaneousCasting) return <SpontaneousSpellbook key={characterClass.id} spells={availableSpells} spellTraitBonuses={spellTraitBonuses} classId={spellListClassId} className={characterClass.name} castingAbilityName={abilityLabels[castingAbility]} slots={spontaneousCasting.slots} knownLimits={spontaneousCasting.known} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} knownSpellIds={selectedSpellIds} grantedSpellIds={grantedSpellIds} onKnownSpellIdsChange={(spellIds) => onSelectedSpellIdsChange(normalizeSelections(spellIds))} slotUses={slotUses} onSlotUsesChange={(uses) => onSlotUsesChange(normalizeSpellSlotUses(uses, slots))} onRefreshDay={refreshDay} />;
  return <Spellbook key={characterClass.id} spells={availableSpells} spellTraitBonuses={spellTraitBonuses} classId={spellListClassId} className={characterClass.name} castingAbilityName={abilityLabels[castingAbility]} slots={preparedCasting?.slots ?? []} preparedLimits={preparedLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} preparedSpellIds={selectedSpellIds} onPreparedSpellIdsChange={(spellIds) => onSelectedSpellIdsChange(normalizeSelections(spellIds))} slotUses={slotUses} onSlotUsesChange={(uses) => onSlotUsesChange(normalizeSpellSlotUses(uses, slots))} reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null} onReservoirChange={onReservoirPointsChange} onRefreshDay={refreshDay} oppositionSchoolIds={oppositionSchoolIds} oppositionSpellIds={oppositionSpellIds} restrictedBonus={restrictedBonus} onDemandSpellCosts={onDemandSpellCosts} requiredPreparedSchool={requiredSchool} spellAutomation={classSpellAutomation(characterClass, classLevel, Object.values(selectedOptions))} abilityModifiers={calculateAbilityModifiers(abilities)} onAddEffect={onAddEffect} />;
}
