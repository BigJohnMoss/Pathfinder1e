"use client";

import { useEffect, useMemo } from "react";
import { optionGroups } from "./character-catalogue";
import { Spellbook } from "./spellbook";
import { SpontaneousSpellbook } from "./spontaneous-spellbook";
import { arcaneReservoir, normalizeSpellSlotUses, spellSaveDC, spellcastingProgression, spellsAvailableToClass } from "../../../packages/engine/src/index.js";
import { normalizePreparedSpellsWithOpposition } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../../../packages/engine/src/spontaneous-spellcasting.js";
import { bloodlineBonusSpells } from "../../../packages/engine/src/sorcerer-bloodlines.js";
import { mysteryBonusSpells } from "../../../packages/engine/src/oracle-mysteries.js";
import type { AbilityScores, CharacterClass, CharacterOption, CharacterSpell } from "../../../packages/types/src/index.js";

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
  onReservoirPointsChange
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
  const grantedSpells = useMemo(() => characterClass.id === "sorcerer" && casting
    ? bloodlineBonusSpells(spells, bloodline, classLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
    : characterClass.id === "oracle" && casting
      ? mysteryBonusSpells(spells, mystery, classLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
      : [], [bloodline, casting, characterClass.id, classLevel, maximumSpellLevel, mystery]);
  const availableSpells = useMemo(() => mergeSpellLists(baseSpells, grantedSpells), [baseSpells, grantedSpells]);
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
  const limits = spontaneousCasting?.known ?? preparedCasting?.prepared ?? [];
  const slots = casting?.slots ?? [];
  const spellDcs = casting ? Object.fromEntries(Array.from({ length: maximumSpellLevel + 1 }, (_, spellLevel) => [spellLevel, spellSaveDC(abilityScore, spellLevel)])) : {};
  const reservoir = characterClass.id === "arcanist" ? arcaneReservoir(classLevel) : null;
  const normalizeSelections = (spellIds: string[]) => spontaneous
    ? normalizeKnownSpells(spellIds, availableSpells, spellListClassId, limits, grantedSpellIds)
    : normalizePreparedSpellsWithOpposition(spellIds, availableSpells, spellListClassId, limits, oppositionSchoolIds, oppositionSpellIds, restrictedBonus);

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
  return <Spellbook key={characterClass.id} spells={availableSpells} spellTraitBonuses={spellTraitBonuses} classId={spellListClassId} className={characterClass.name} castingAbilityName={abilityLabels[castingAbility]} slots={preparedCasting?.slots ?? []} preparedLimits={preparedCasting?.prepared ?? []} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} preparedSpellIds={selectedSpellIds} onPreparedSpellIdsChange={(spellIds) => onSelectedSpellIdsChange(normalizeSelections(spellIds))} slotUses={slotUses} onSlotUsesChange={(uses) => onSlotUsesChange(normalizeSpellSlotUses(uses, slots))} reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null} onReservoirChange={onReservoirPointsChange} onRefreshDay={refreshDay} oppositionSchoolIds={oppositionSchoolIds} oppositionSpellIds={oppositionSpellIds} restrictedBonus={restrictedBonus} />;
}
