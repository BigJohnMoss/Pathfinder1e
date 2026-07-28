"use client";

import { useEffect, useMemo, useState } from "react";
import { ancestries, archetypes, classes, feats, optionGroups, skills, spells, traits } from "./character-catalogue";
import { AbilityEditor } from "./ability-editor";
import { CharacterDetails } from "./character-details";
import { ClassFeatures } from "./class-features";
import { Spellbook } from "./spellbook";
import { SpontaneousSpellbook } from "./spontaneous-spellbook";
import { ClassSpellbook } from "./class-spellbook";
import { SkillAllocation } from "./skill-allocation";
import { FeatChoices } from "./feat-choices";
import { ClassOptions } from "./class-options";
import { CombatPanel, ProgressionSummary } from "./character-summary";
import { CharacterTabs, type CharacterTabId } from "./character-tabs";
import { TraitChoices } from "./trait-choices";
import { EquipmentPanel, equipmentArmorBonus, type CoinPurse, type InventoryEntry } from "./equipment-panel";
import { LevelUpPanel } from "./level-up-panel";
import { ActivePlayPanel } from "./active-play-panel";
import { FavoredClassBonus } from "./favored-class-bonus";
import { CharacterLibrary, characterLibraryKey, emptyCharacterLibrary, legacyCharacterKey, normalizeCharacterLibrary, type CharacterLibraryV1 } from "./character-library";
import { abilityBoostCount, abilityNames, applyArchetype, arcaneReservoir, availableOptions, bardicPerformanceRounds, characterCombatStats, classProgression, druidWildShapeUses, featBonuses, featPrerequisiteResults, multiclassAverageHitPoints, multiclassProgression, normalizeAbilityBoosts, normalizeCharacterDraft, normalizeSelectedFeatChoices, normalizeSelectedFeats, normalizeSelectedTraitChoices, normalizeSelectedTraits, normalizeSkillRanks, normalizeSpellSlotUses, pointBuySummary, prerequisitesMet, skillRankBudget, skillTotal, spellSaveDC, spellcastingProgression, spellsAvailableToClass, traitBonuses } from "../../../packages/engine/src/index.js";
import { normalizePreparedSpellsWithOpposition } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../../../packages/engine/src/spontaneous-spellcasting.js";
import { bloodlineBonusSpells, bloodlineClassSkills } from "../../../packages/engine/src/sorcerer-bloodlines.js";
import { mysteryBonusSpells } from "../../../packages/engine/src/oracle-mysteries.js";
import type { ActiveEffect, CharacterClassLevel, CharacterDraftV1 } from "../../../packages/types/src/index.js";

const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const defaultAbilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const archetypeIdsByClass = Object.fromEntries(classes.map((characterClass) => [characterClass.id, archetypes.filter((archetype) => archetype.classId === characterClass.id).map((archetype) => archetype.id)]));
const wizardOppositionFeatureIds = ["wizard-opposition-school-1-first", "wizard-opposition-school-1-second"] as const;
const oppositionSchoolsFromOptions = (selectedClassId: string, options: Record<string, string>) => selectedClassId === "wizard"
  ? wizardOppositionFeatureIds.map((featureId) => options[featureId]).filter((id): id is string => typeof id === "string" && id.length > 0)
  : [];
const bloodlineFromOptions = (selectedClassId: string, options: Record<string, string>) => selectedClassId === "sorcerer"
  ? optionGroups.find((group) => group.id === "sorcerer-bloodlines")?.options.find((option) => option.id === options["sorcerer-bloodline-1"])
  : undefined;
const mysteryFromOptions = (selectedClassId: string, options: Record<string, string>) => selectedClassId === "oracle"
  ? optionGroups.find((group) => group.id === "oracle-mysteries")?.options.find((option) => option.id === options["oracle-mystery-1"])
  : undefined;

function mergeSpellLists<T extends { id: string }>(baseSpells: T[], grantedSpells: T[]) {
  const byId = new Map(baseSpells.map((spell) => [spell.id, spell]));
  for (const spell of grantedSpells) byId.set(spell.id, spell);
  return [...byId.values()];
}

export default function Home() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("arcanist");
  const [additionalClassLevels, setAdditionalClassLevels] = useState<CharacterClassLevel[]>([]);
  const [archetypeId, setArchetypeId] = useState("");
  const [additionalArchetypeIds, setAdditionalArchetypeIds] = useState<Record<string, string>>({});
  const [ancestryId, setAncestryId] = useState("human");
  const [level, setLevel] = useState(1);
  const [humanAbility, setHumanAbility] = useState<keyof typeof defaultAbilities>("intelligence");
  const [baseAbilities, setBaseAbilities] = useState(defaultAbilities);
  const [pointBuyBudget, setPointBuyBudget] = useState<10 | 15 | 20 | 25>(15);
  const [abilityBoosts, setAbilityBoosts] = useState<(keyof typeof defaultAbilities)[]>([]);
  const [favoredClassHitPoints, setFavoredClassHitPoints] = useState(0);
  const [favoredClassSkillRanks, setFavoredClassSkillRanks] = useState(0);
  const [selectedFeatIds, setSelectedFeatIds] = useState<string[]>([]);
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);
  const [selectedTraitChoices, setSelectedTraitChoices] = useState<Record<string, string>>({});
  const [selectedFeatChoices, setSelectedFeatChoices] = useState<Record<string, string>>({});
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedSpellIds, setSelectedSpellIds] = useState<string[]>([]);
  const [spellSlotUses, setSpellSlotUses] = useState<Record<number, number>>({});
  const [secondarySelectedSpellIds, setSecondarySelectedSpellIds] = useState<string[]>([]);
  const [secondarySpellSlotUses, setSecondarySpellSlotUses] = useState<Record<number, number>>({});
  const [extraSelectedSpellsByClass, setExtraSelectedSpellsByClass] = useState<Record<string, string[]>>({});
  const [extraSpellSlotUsesByClass, setExtraSpellSlotUsesByClass] = useState<Record<string, Record<number, number>>>({});
  const [activeSpellClassId, setActiveSpellClassId] = useState("");
  const [reservoirPoints, setReservoirPoints] = useState(3);
  const [bardicPerformanceUsed, setBardicPerformanceUsed] = useState(0);
  const [wildShapeUsed, setWildShapeUsed] = useState(0);
  const [currentHitPoints, setCurrentHitPoints] = useState<number | null>(null);
  const [temporaryHitPoints, setTemporaryHitPoints] = useState(0);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [coins, setCoins] = useState<CoinPurse>({ cp: 0, sp: 0, gp: 0, pp: 0 });
  const [activeTab, setActiveTab] = useState<CharacterTabId>("overview");
  const [saveNotice, setSaveNotice] = useState("");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpClassId, setLevelUpClassId] = useState("");
  const [characterLibrary, setCharacterLibrary] = useState<CharacterLibraryV1>(emptyCharacterLibrary);

  const baseCharacterClass = classes.find((item) => item.id === classId) ?? classes[0];
  const availableArchetypes = archetypes.filter((item) => item.classId === baseCharacterClass.id);
  const selectedArchetype = availableArchetypes.find((item) => item.id === archetypeId);
  const characterClass = useMemo(() => applyArchetype(baseCharacterClass, selectedArchetype), [baseCharacterClass, selectedArchetype]);
  const additionalCharacterClasses = useMemo(() => additionalClassLevels.map((entry) => {
    const baseClass = classes.find((item) => item.id === entry.classId);
    const selectedAdditionalArchetype = archetypes.find((item) => item.id === additionalArchetypeIds[entry.classId] && item.classId === entry.classId);
    return baseClass ? applyArchetype(baseClass, selectedAdditionalArchetype) : undefined;
  }).filter((item): item is typeof classes[number] => Boolean(item)), [additionalArchetypeIds, additionalClassLevels]);
  const secondaryClassId = additionalClassLevels[0]?.classId ?? "";
  const secondaryClassLevel = additionalClassLevels[0]?.level ?? 0;
  const secondaryCharacterClass = classes.find((item) => item.id === secondaryClassId);
  const assignedAdditionalLevels = additionalClassLevels.reduce((total, entry) => total + entry.level, 0);
  const primaryClassLevel = level - assignedAdditionalLevels;
  const classLevels = useMemo(() => [{ classId: characterClass.id, level: primaryClassLevel }, ...additionalClassLevels], [additionalClassLevels, characterClass.id, primaryClassLevel]);
  const progressionClasses = useMemo(() => [characterClass, ...additionalCharacterClasses], [additionalCharacterClasses, characterClass]);
  const levelUpClassEntry = classLevels.find((entry) => entry.classId === levelUpClassId) ?? classLevels[0];
  const levelUpClassChoices = classLevels.map((entry) => ({ id: entry.classId, name: classes.find((item) => item.id === entry.classId)?.name ?? entry.classId }));
  const classLevelMap = useMemo(() => Object.fromEntries(classLevels.map((entry) => [entry.classId, entry.level])), [classLevels]);
  const ancestry = ancestries.find((item) => item.id === ancestryId) ?? ancestries[0];
  const selectedTraitBonuses = useMemo(() => traitBonuses(selectedTraitIds, traits, selectedTraitChoices, { spells, classes, classId }), [classId, selectedTraitChoices, selectedTraitIds]);
  const selectedBloodline = useMemo(() => bloodlineFromOptions(classId, selectedOptions), [classId, selectedOptions]);
  const selectedMystery = useMemo(() => mysteryFromOptions(classId, selectedOptions), [classId, selectedOptions]);
  const selectedBloodlineClassSkill = selectedOptions["sorcerer-bloodline-class-skill"];
  const selectedOptionClassSkills = useMemo(() => {
    const selectedIds = new Set(Object.values(selectedOptions));
    return optionGroups.flatMap((group) => group.options).filter((option) => selectedIds.has(option.id)).flatMap((option) => option.classSkills ?? []);
  }, [selectedOptions]);
  const skillCharacterClass = useMemo(() => {
    const bloodlineSkills = selectedBloodline?.classSkill
      ? bloodlineClassSkills(characterClass.classSkills, selectedBloodline, selectedBloodlineClassSkill)
      : characterClass.classSkills;
    return { ...characterClass, classSkills: [...new Set([...bloodlineSkills, ...additionalCharacterClasses.flatMap((item) => item.classSkills), ...selectedTraitBonuses.classSkills, ...selectedOptionClassSkills])] };
  }, [additionalCharacterClasses, characterClass, selectedBloodline, selectedBloodlineClassSkill, selectedOptionClassSkills, selectedTraitBonuses.classSkills]);
  const fixedModifiers = (ancestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {};
  const choiceAmount = (ancestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
  const abilities = useMemo(() => Object.fromEntries(Object.keys(baseAbilities).map((ability) => [ability, baseAbilities[ability as keyof typeof baseAbilities] + (fixedModifiers[ability as keyof typeof baseAbilities] ?? 0) + (choiceAmount && ability === humanAbility ? choiceAmount : 0) + abilityBoosts.filter(boost => boost === ability).length])) as typeof baseAbilities, [abilityBoosts, baseAbilities, choiceAmount, fixedModifiers, humanAbility]);
  const pointBuy = pointBuySummary(baseAbilities, pointBuyBudget);
  useEffect(() => setAbilityBoosts(current => { const next = normalizeAbilityBoosts(current, level); while (next.length < abilityBoostCount(level)) next.push("strength"); return next; }), [level]);
  useEffect(() => {
    setFavoredClassHitPoints(current => Math.min(current, level));
    setFavoredClassSkillRanks(current => Math.min(current, Math.max(0, level - favoredClassHitPoints)));
  }, [favoredClassHitPoints, level]);
  useEffect(() => setAdditionalClassLevels((current) => {
    const seen = new Set([classId]);
    const valid = current.filter((entry) => {
      if (!classes.some((item) => item.id === entry.classId) || seen.has(entry.classId)) return false;
      seen.add(entry.classId);
      return true;
    }).slice(0, Math.max(0, level - 1));
    let remaining = level - 1;
    const next = valid.map((entry, index) => {
      const maximum = remaining - (valid.length - index - 1);
      const normalized = { classId: entry.classId, level: Math.max(1, Math.min(entry.level, maximum)) };
      remaining -= normalized.level;
      return normalized;
    });
    return next.length === current.length && next.every((entry, index) => entry.classId === current[index].classId && entry.level === current[index].level) ? current : next;
  }), [classId, level]);
  const ancestryBonusFeats = ancestry.traits.some((trait) => trait.id === "human-bonus-feat") ? 1 : 0;
  const progression = useMemo(() => {
    const options = {
      intelligenceScore: abilities.intelligence,
      racialSkillBonusPerLevel: ancestry.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
      bonusFeats: ancestryBonusFeats
    };
    const base = additionalCharacterClasses.length > 0
      ? multiclassProgression(progressionClasses, classLevels, options)
      : classProgression(characterClass, level, options);
    return { ...base, skillRanks: base.skillRanks + favoredClassSkillRanks };
  }, [abilities.intelligence, additionalCharacterClasses.length, ancestry, ancestryBonusFeats, characterClass, classLevels, favoredClassSkillRanks, level, progressionClasses]);
  const nextProgression = useMemo(() => {
    if (level >= 20) return null;
    const options = {
      intelligenceScore: abilities.intelligence,
      racialSkillBonusPerLevel: ancestry.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
      bonusFeats: ancestryBonusFeats
    };
    return additionalCharacterClasses.length > 0
      ? multiclassProgression(progressionClasses, classLevels.map((entry) => entry.classId === levelUpClassEntry.classId ? { ...entry, level: entry.level + 1 } : entry), options)
      : classProgression(characterClass, level + 1, options);
  }, [abilities.intelligence, additionalCharacterClasses.length, ancestry, ancestryBonusFeats, characterClass, classLevels, level, levelUpClassEntry.classId, progressionClasses]);
  const baseCombat = useMemo(() => {
    const base = characterCombatStats(characterClass, level, abilities);
    if (additionalCharacterClasses.length === 0) return base;
    const saves = progression.saves;
    return {
      ...base,
      baseAttackBonus: progression.baseAttackBonus,
      saves: {
        fortitude: saves.fortitude + base.abilityModifiers.constitution,
        reflex: saves.reflex + base.abilityModifiers.dexterity,
        will: saves.will + base.abilityModifiers.wisdom
      },
      combatManeuverBonus: progression.baseAttackBonus + base.abilityModifiers.strength,
      combatManeuverDefense: 10 + progression.baseAttackBonus + base.abilityModifiers.strength + base.abilityModifiers.dexterity,
      averageHitPoints: multiclassAverageHitPoints(progressionClasses, classLevels, base.abilityModifiers.constitution)
    };
  }, [abilities, additionalCharacterClasses.length, characterClass, classLevels, level, progression.baseAttackBonus, progression.saves, progressionClasses]);
  const selectedClassFeatIds = useMemo(() => [...progression.features.flatMap((feature) => feature.grantedFeatId ? [feature.grantedFeatId] : []), ...Object.values(selectedOptions).flatMap((optionId) => {
    const option = optionGroups.flatMap((group) => group.options).find((candidate) => candidate.id === optionId);
    return option?.featId ? [option.featId] : [];
  })], [progression.features, selectedOptions]);
  const selectedFeatBonuses = useMemo(() => featBonuses(
    [...selectedFeatIds, ...selectedClassFeatIds],
    feats,
    selectedFeatChoices,
    { level, skillRanks }
  ), [level, selectedClassFeatIds, selectedFeatChoices, selectedFeatIds, skillRanks]);
  const combat = useMemo(() => {
    const armorBonus = equipmentArmorBonus(inventory);
    const activeBonus = (target: ActiveEffect["target"]) => activeEffects.filter(effect => effect.target === target).reduce((total, effect) => total + effect.bonus, 0);
    return {
      ...baseCombat,
      initiative: baseCombat.initiative + selectedTraitBonuses.initiative + selectedFeatBonuses.initiative + activeBonus("initiative"),
      saves: {
        fortitude: baseCombat.saves.fortitude + selectedTraitBonuses.saves.fortitude + selectedFeatBonuses.saves.fortitude + activeBonus("fortitude"),
        reflex: baseCombat.saves.reflex + selectedTraitBonuses.saves.reflex + selectedFeatBonuses.saves.reflex + activeBonus("reflex"),
        will: baseCombat.saves.will + selectedTraitBonuses.saves.will + selectedFeatBonuses.saves.will + activeBonus("will")
      },
      armorClass: {
        normal: baseCombat.armorClass.normal + armorBonus + selectedFeatBonuses.armorClass.normal + activeBonus("armorClass"),
        touch: baseCombat.armorClass.touch + selectedFeatBonuses.armorClass.touch + activeBonus("armorClass"),
        flatFooted: baseCombat.armorClass.flatFooted + armorBonus + selectedFeatBonuses.armorClass.flatFooted + activeBonus("armorClass")
      },
      averageHitPoints: baseCombat.averageHitPoints + selectedFeatBonuses.hitPoints + favoredClassHitPoints
    };
  }, [activeEffects, baseCombat, favoredClassHitPoints, inventory, selectedFeatBonuses, selectedTraitBonuses]);
  const featSlots = useMemo(() => Array.from({ length: progression.featSlots }, (_, index) => ({ index, name: index < ancestryBonusFeats ? `${ancestry.name} bonus feat` : `Feat ${index - ancestryBonusFeats + 1}` })), [ancestry.name, ancestryBonusFeats, progression.featSlots]);
  const levelUpGains = useMemo(() => {
    if (!nextProgression) return [];
    const currentFeatureIds = new Set(progression.features.map((feature) => feature.id));
    const gains = nextProgression.features.filter((feature) => !currentFeatureIds.has(feature.id)).map((feature) => `${feature.name}: ${feature.summary}`);
    const featGain = nextProgression.featSlots - progression.featSlots;
    const skillGain = nextProgression.skillRanks - progression.skillRanks;
    if (abilityBoostCount(level + 1) > abilityBoostCount(level)) gains.push("Choose a +1 increase to one ability score.");
    if (featGain > 0) gains.push(`Choose ${featGain} new feat${featGain === 1 ? "" : "s"}.`);
    if (skillGain > 0) gains.push(`Allocate ${skillGain} new skill rank${skillGain === 1 ? "" : "s"}.`);
    return gains;
  }, [level, nextProgression, progression.featSlots, progression.skillRanks]);
  const casterLevel = Math.max(0, ...classLevels.map((entry) => classes.find((item) => item.id === entry.classId)?.spellcasting ? entry.level : 0));
  const featContext = useMemo(() => ({ classId: characterClass.id, classLevels: classLevelMap, ancestryId, size: ancestry.size, classLevel: level, casterLevel, abilities, baseAttackBonus: progression.baseAttackBonus, skillRanks, featureIds: progression.features.map((feature) => feature.id), selectedIds: selectedClassFeatIds, selectedFeatChoices }), [abilities, ancestry.size, ancestryId, casterLevel, characterClass.id, classLevelMap, level, progression.baseAttackBonus, progression.features, selectedClassFeatIds, selectedFeatChoices, skillRanks]);
  const featChoices = featSlots.map((slot) => { const selected = feats.find((feat) => feat.id === selectedFeatIds[slot.index]); const otherFeatIds = selectedFeatIds.filter((_, index) => index !== slot.index); const context = { ...featContext, candidateId: selected?.id, selectedIds: [...selectedClassFeatIds, ...otherFeatIds] }; const checks = selected ? featPrerequisiteResults(selected, context) : []; return { ...slot, selecte…6330 tokens truncated…ifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
    const draftAbilities = Object.fromEntries(Object.keys(draft.baseAbilities).map((ability) => [ability, draft.baseAbilities[ability as keyof typeof defaultAbilities] + (draftFixedModifiers[ability as keyof typeof defaultAbilities] ?? 0) + (draftChoiceAmount && ability === draft.humanAbility ? draftChoiceAmount : 0) + draft.abilityBoosts.filter((boost) => boost === ability).length])) as typeof defaultAbilities;
    const draftCastingAbility = draftClass.spellcasting && abilityNames.includes(draftClass.spellcasting.ability as keyof typeof draftAbilities) ? draftClass.spellcasting.ability as keyof typeof draftAbilities : null;
    const draftAbilityScore = draftCastingAbility ? draftAbilities[draftCastingAbility] : 10;
    const draftIsSpontaneous = draftClass.spellcasting?.castingType === "spontaneous";
    const draftPreparedCasting = draftClass.spellcasting && !draftIsSpontaneous ? spellcastingProgression(draftClass, draftPrimaryLevel, { abilityScore: draftAbilityScore }) : null;
    const draftSpontaneousCasting = draftIsSpontaneous ? spontaneousSpellcastingProgression(draftClass, draftPrimaryLevel, { abilityScore: draftAbilityScore }) : null;
    const draftCasting = draftSpontaneousCasting ?? draftPreparedCasting;
    const draftBaseSpells = draftCasting ? spellsAvailableToClass(spells, draftClass.id, draftCasting.maximumSpellLevel) : [];
    const draftReservoir = draft.classId === "arcanist" ? arcaneReservoir(draftPrimaryLevel) : null;
    const draftBardLevel = draft.classLevels.find((entry) => entry.classId === "bard")?.level ?? 0;
    const draftDruidLevel = draft.classLevels.find((entry) => entry.classId === "druid")?.level ?? 0;
    const draftBardicPerformanceMaximum = draftBardLevel > 0 ? bardicPerformanceRounds(draftBardLevel, Math.floor((draftAbilities.charisma - 10) / 2)) : 0;
    const draftWildShapeMaximum = draftDruidLevel > 0 ? druidWildShapeUses(draftDruidLevel) : 0;
    const draftOppositionSchoolIds = oppositionSchoolsFromOptions(draft.classId, draft.selectedOptions);
    const draftBloodline = bloodlineFromOptions(draft.classId, draft.selectedOptions);
    const draftBloodlineSpells = draftIsSpontaneous && draftCasting ? bloodlineBonusSpells(spells, draftBloodline, draftPrimaryLevel, draftClass.id).filter((spell) => spell.levelByClass[draftClass.id] <= draftCasting.maximumSpellLevel) : [];
    const draftSpells = mergeSpellLists(draftBaseSpells, draftBloodlineSpells);
    const draftBloodlineSpellIds = draftBloodlineSpells.map((spell) => spell.id);
    const draftPrimarySelections = draft.preparedSpellsByClass[draft.classId] ?? draft.preparedSpells;
    const normalizedDraftSpells = draftIsSpontaneous ? normalizeKnownSpells(draftPrimarySelections, draftSpells, draftClass.id, draftSpontaneousCasting?.known ?? [], draftBloodlineSpellIds) : normalizePreparedSpellsWithOpposition(draftPrimarySelections, draftSpells, draftClass.id, draftPreparedCasting?.prepared ?? [], draftOppositionSchoolIds);
    const draftSecondaryAbility = draftSecondaryClass?.spellcasting && abilityNames.includes(draftSecondaryClass.spellcasting.ability as keyof typeof draftAbilities) ? draftSecondaryClass.spellcasting.ability as keyof typeof draftAbilities : null;
    const draftSecondaryAbilityScore = draftSecondaryAbility ? draftAbilities[draftSecondaryAbility] : 10;
    const draftSecondaryIsSpontaneous = draftSecondaryClass?.spellcasting?.castingType === "spontaneous";
    const draftSecondaryPrepared = draftSecondaryClass?.spellcasting && !draftSecondaryIsSpontaneous ? spellcastingProgression(draftSecondaryClass, draftSecondaryLevel?.level ?? 1, { abilityScore: draftSecondaryAbilityScore }) : null;
    const draftSecondarySpontaneous = draftSecondaryClass && draftSecondaryIsSpontaneous ? spontaneousSpellcastingProgression(draftSecondaryClass, draftSecondaryLevel?.level ?? 1, { abilityScore: draftSecondaryAbilityScore }) : null;
    const draftSecondaryCasting = draftSecondarySpontaneous ?? draftSecondaryPrepared;
    const draftSecondaryBaseSpells = draftSecondaryClass && draftSecondaryCasting ? spellsAvailableToClass(spells, draftSecondaryClass.id, draftSecondaryCasting.maximumSpellLevel) : [];
    const draftSecondaryBloodline = draftSecondaryClass ? bloodlineFromOptions(draftSecondaryClass.id, draft.selectedOptions) : undefined;
    const draftSecondaryMystery = draftSecondaryClass ? mysteryFromOptions(draftSecondaryClass.id, draft.selectedOptions) : undefined;
    const draftSecondaryGranted = draftSecondaryClass?.id === "sorcerer" && draftSecondaryCasting
      ? bloodlineBonusSpells(spells, draftSecondaryBloodline, draftSecondaryLevel?.level ?? 1, draftSecondaryClass.id).filter((spell) => spell.levelByClass[draftSecondaryClass.id] <= draftSecondaryCasting.maximumSpellLevel)
      : draftSecondaryClass?.id === "oracle" && draftSecondaryCasting
        ? mysteryBonusSpells(spells, draftSecondaryMystery, draftSecondaryLevel?.level ?? 1, draftSecondaryClass.id).filter((spell) => spell.levelByClass[draftSecondaryClass.id] <= draftSecondaryCasting.maximumSpellLevel)
        : [];
    const draftSecondarySpells = mergeSpellLists(draftSecondaryBaseSpells, draftSecondaryGranted);
    const draftSecondarySelections = draftSecondaryClass ? (draft.preparedSpellsByClass[draftSecondaryClass.id] ?? []) : [];
    const normalizedDraftSecondarySpells = !draftSecondaryClass ? [] : draftSecondaryIsSpontaneous
      ? normalizeKnownSpells(draftSecondarySelections, draftSecondarySpells, draftSecondaryClass.id, draftSecondarySpontaneous?.known ?? [], draftSecondaryGranted.map((spell) => spell.id))
      : normalizePreparedSpellsWithOpposition(draftSecondarySelections, draftSecondarySpells, draftSecondaryClass.id, draftSecondaryPrepared?.prepared ?? [], oppositionSchoolsFromOptions(draftSecondaryClass.id, draft.selectedOptions));
    const draftTraitIds = normalizeSelectedTraits(draft.selectedTraitIds, traits);
    const draftSecondaryReservoir = draftSecondaryClass?.id === "arcanist" ? arcaneReservoir(draftSecondaryLevel?.level ?? 1) : null;
    const draftArcanistLevel = draft.classLevels.find((entry) => entry.classId === "arcanist")?.level;
    const draftAnyReservoir = draftArcanistLevel ? arcaneReservoir(draftArcanistLevel) : null;
    setName(draft.name); setClassId(draft.classId); setAdditionalClassLevels(draft.classLevels.slice(1)); setArchetypeId(draft.archetypeIdsByClass[draft.classId] ?? draft.archetypeId); setAdditionalArchetypeIds(Object.fromEntries(Object.entries(draft.archetypeIdsByClass).filter(([selectedClassId]) => selectedClassId !== draft.classId))); setAncestryId(draft.ancestryId); setLevel(draft.level); setHumanAbility(draft.humanAbility); setBaseAbilities(draft.baseAbilities); setPointBuyBudget(draft.pointBuyBudget); setAbilityBoosts(draft.abilityBoosts); setFavoredClassHitPoints(draft.favoredClassHitPoints); setFavoredClassSkillRanks(draft.favoredClassSkillRanks); setSelectedFeatIds(draft.selectedFeatIds); setSelectedTraitIds(draftTraitIds); setSelectedTraitChoices(normalizeSelectedTraitChoices(draft.selectedTraitChoices, draftTraitIds, traits, { spells, classes, classId: draft.classId })); setSelectedFeatChoices(normalizeSelectedFeatChoices(draft.selectedFeatChoices, draft.selectedFeatIds, feats)); setSkillRanks(draft.skillRanks); setSelectedOptions(draft.selectedOptions); setSelectedSpellIds(normalizedDraftSpells); setSecondarySelectedSpellIds(normalizedDraftSecondarySpells); setExtraSelectedSpellsByClass(Object.fromEntries(draft.classLevels.slice(2).map((entry) => [entry.classId, draft.preparedSpellsByClass[entry.classId] ?? []]))); setSpellSlotUses(normalizeSpellSlotUses(draft.spellSlotUsesByClass[draft.classId] ?? draft.spellSlotUses, draftCasting?.slots ?? [])); setSecondarySpellSlotUses(normalizeSpellSlotUses(draftSecondaryClass ? draft.spellSlotUsesByClass[draftSecondaryClass.id] ?? {} : {}, draftSecondaryCasting?.slots ?? [])); setExtraSpellSlotUsesByClass(Object.fromEntries(draft.classLevels.slice(2).map((entry) => [entry.classId, Object.fromEntries(Object.entries(draft.spellSlotUsesByClass[entry.classId] ?? {}).map(([spellLevel, uses]) => [Number(spellLevel), uses]))]))); setReservoirPoints(draftAnyReservoir ? Math.min(draft.arcaneReservoir ?? draftAnyReservoir.dailyRefresh, draftAnyReservoir.maximum) : 0); setBardicPerformanceUsed(Math.min(draft.bardicPerformanceUsed, draftBardicPerformanceMaximum)); setWildShapeUsed(draftWildShapeMaximum === null ? 0 : Math.min(draft.wildShapeUsed, draftWildShapeMaximum)); setCurrentHitPoints(draft.currentHitPoints); setTemporaryHitPoints(draft.temporaryHitPoints); setActiveEffects(draft.activeEffects); setInventory(draft.inventory); setCoins(draft.coins); setSaveNotice(successNotice);
    return draft;
  };
  const saveCharacter = () => {
    const id = characterLibrary.activeCharacterId ?? (globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`);
    const entry = { id, updatedAt: new Date().toISOString(), draft: characterDraft };
    persistLibrary({ version: 1, activeCharacterId: id, characters: [...characterLibrary.characters.filter((item) => item.id !== id), entry] });
    localStorage.setItem(legacyCharacterKey, JSON.stringify(characterDraft));
    setSaveNotice(`Saved ${characterDraft.name.trim() || "unnamed hero"} to your library`);
  };
  const loadCharacter = () => {
    const active = characterLibrary.characters.find((entry) => entry.id === characterLibrary.activeCharacterId);
    if (active) { applyCharacterDraft(active.draft, "Loaded saved character"); return; }
    const saved = localStorage.getItem(legacyCharacterKey);
    if (!saved) { setSaveNotice("No saved character"); return; }
    try {
      const draft = applyCharacterDraft(JSON.parse(saved), "Loaded saved character");
      if (draft) {
        const id = globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`;
        persistLibrary({ version: 1, activeCharacterId: id, characters: [{ id, updatedAt: new Date().toISOString(), draft }] });
        localStorage.setItem(legacyCharacterKey, JSON.stringify(draft));
      }
    } catch { setSaveNotice("Saved character is invalid"); }
  };
  const importCharacter = async (file: File) => {
    if (file.size > 1_000_000) { setSaveNotice("Character file is too large"); return; }
    try { applyCharacterDraft(JSON.parse(await file.text()), "Imported character"); }
    catch { setSaveNotice("Character file is invalid"); }
  };
  const resetCharacter = () => { localStorage.removeItem(legacyCharacterKey); setName(""); setClassId("arcanist"); setAdditionalClassLevels([]); setArchetypeId(""); setAdditionalArchetypeIds({}); setAncestryId("human"); setLevel(1); setHumanAbility("intelligence"); setBaseAbilities(defaultAbilities); setPointBuyBudget(15); setAbilityBoosts([]); setFavoredClassHitPoints(0); setFavoredClassSkillRanks(0); setSelectedFeatIds([]); setSelectedTraitIds([]); setSelectedTraitChoices({}); setSelectedFeatChoices({}); setSkillRanks({}); setSelectedOptions({}); setSelectedSpellIds([]); setSecondarySelectedSpellIds([]); setExtraSelectedSpellsByClass({}); setSpellSlotUses({}); setSecondarySpellSlotUses({}); setExtraSpellSlotUsesByClass({}); setActiveSpellClassId(""); setReservoirPoints(3); setBardicPerformanceUsed(0); setWildShapeUsed(0); setCurrentHitPoints(null); setTemporaryHitPoints(0); setActiveEffects([]); setInventory([]); setCoins({ cp: 0, sp: 0, gp: 0, pp: 0 }); setSaveNotice("Character reset"); };
  const newCharacter = () => { resetCharacter(); persistLibrary({ ...characterLibrary, activeCharacterId: null }); setSaveNotice("New character started; your library is unchanged"); };
  const openLibraryCharacter = (entry: CharacterLibraryV1["characters"][number]) => {
    const draft = applyCharacterDraft(entry.draft, `Opened ${entry.draft.name.trim() || "unnamed hero"}`);
    if (draft) {
      persistLibrary({ ...characterLibrary, activeCharacterId: entry.id });
      localStorage.setItem(legacyCharacterKey, JSON.stringify(draft));
    }
  };
  const deleteLibraryCharacter = (id: string) => {
    const characters = characterLibrary.characters.filter((entry) => entry.id !== id);
    const activeCharacterId = characterLibrary.activeCharacterId === id ? null : characterLibrary.activeCharacterId;
    persistLibrary({ version: 1, activeCharacterId, characters });
    if (!activeCharacterId) localStorage.removeItem(legacyCharacterKey);
    setSaveNotice("Character deleted from your library");
  };
  const exportCharacter = () => { const draft = { ...characterDraft, exportedAt: new Date().toISOString() }; const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pf1e-character"}.json`; link.click(); URL.revokeObjectURL(url); setSaveNotice("Character exported"); };
  const printCharacter = () => window.print();

  return <main id="character-builder-main" tabIndex={-1}>
    <header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>{name || "Character Builder"}</h1><p>Create a character foundation, then see the rules statistics it earns.</p></header>
    <CharacterDetails name={name} classId={classId} additionalClassLevels={additionalClassLevels} additionalArchetypeIds={additionalArchetypeIds} archetypeId={archetypeId} ancestryId={ancestryId} level={level} classes={classes} archetypes={archetypes} ancestries={ancestries} saveNotice={saveNotice} onNameChange={setName} onClassChange={(next) => { setClassId(next); setArchetypeId(""); }} onAdditionalClassLevelsChange={(next) => { setAdditionalClassLevels(next); const validIds = new Set(next.map((entry) => entry.classId)); setAdditionalArchetypeIds((current) => Object.fromEntries(Object.entries(current).filter(([selectedClassId]) => validIds.has(selectedClassId)))); if (next.length > 0 && level < next.length + 1) setLevel(next.length + 1); }} onAdditionalArchetypeChange={(selectedClassId, selectedId) => setAdditionalArchetypeIds((current) => selectedId ? { ...current, [selectedClassId]: selectedId } : Object.fromEntries(Object.entries(current).filter(([key]) => key !== selectedClassId)))} onArchetypeChange={setArchetypeId} onAncestryChange={setAncestryId} onLevelChange={(next) => { setLevel(next); setShowLevelUp(false); }} onReviewLevelUp={() => { setLevelUpClassId(characterClass.id); setShowLevelUp(true); }} onSave={saveCharacter} onLoad={loadCharacter} onImport={importCharacter} onExport={exportCharacter} onPrint={printCharacter} onReset={resetCharacter} />
    {showLevelUp && level < 20 && <LevelUpPanel currentLevel={level} classId={levelUpClassEntry.classId} classLevel={levelUpClassEntry.level} classChoices={levelUpClassChoices} gains={levelUpGains} onClassChange={setLevelUpClassId} onCancel={() => setShowLevelUp(false)} onConfirm={() => { if (levelUpClassEntry.classId !== characterClass.id) setAdditionalClassLevels((current) => current.map((entry) => entry.classId === levelUpClassEntry.classId ? { ...entry, level: entry.level + 1 } : entry)); setLevel(level + 1); setShowLevelUp(false); setSaveNotice(levelUpClassChoices.length > 1 ? `Advanced ${levelUpClassChoices.find((choice) => choice.id === levelUpClassEntry.classId)?.name ?? levelUpClassEntry.classId} to level ${levelUpClassEntry.level + 1}. Review newly unlocked choices.` : `Advanced to level ${level + 1}. Review newly unlocked choices.`); }} />}
    <CharacterTabs activeTab={activeTab} onChange={setActiveTab} />
    <section id="character-tab-panel" className="tab-panel" role="tabpanel" aria-labelledby={`character-tab-${activeTab}`} tabIndex={0}>
      {activeTab === "overview" && <section className="sheet-grid"><AbilityEditor abilityNames={abilityNames} ancestryName={ancestry.name} choiceAbility={humanAbility} choiceAmount={choiceAmount} baseAbilities={baseAbilities} abilities={abilities} modifiers={combat.abilityModifiers} pointBuyBudget={pointBuyBudget} pointBuySpent={pointBuy.spent} abilityBoosts={abilityBoosts} onChoiceAbilityChange={setHumanAbility} onAbilityChange={updateAbility} onPointBuyBudgetChange={setPointBuyBudget} onAbilityBoostChange={updateAbilityBoost} /><ProgressionSummary combat={combat} progression={progression} /><FavoredClassBonus className={characterClass.name} level={level} hitPoints={favoredClassHitPoints} skillRanks={favoredClassSkillRanks} onChange={(hitPoints, skillRanks) => { setFavoredClassHitPoints(hitPoints); setFavoredClassSkillRanks(skillRanks); }} /></section>}
      {activeTab === "actions" && <div className="actions-workspace"><CombatPanel combat={combat} modifierSources={selectedFeatBonuses.sources} conditionalModifiers={selectedTraitBonuses.conditionalModifiers} /><ActivePlayPanel maximumHitPoints={combat.averageHitPoints} currentHitPoints={currentHitPoints ?? combat.averageHitPoints} temporaryHitPoints={temporaryHitPoints} effects={activeEffects} onCurrentHitPointsChange={setCurrentHitPoints} onTemporaryHitPointsChange={setTemporaryHitPoints} onEffectsChange={setActiveEffects} /></div>}
      {activeTab === "storage" && <div className="storage-workspace"><CharacterLibrary library={characterLibrary} classNames={Object.fromEntries(classes.map((item) => [item.id, item.name]))} ancestryNames={Object.fromEntries(ancestries.map((item) => [item.id, item.name]))} onOpen={openLibraryCharacter} onDelete={deleteLibraryCharacter} onNew={newCharacter} /><EquipmentPanel strength={abilities.strength} strengthModifier={combat.abilityModifiers.strength} dexterityModifier={combat.abilityModifiers.dexterity} baseAttackBonus={progression.baseAttackBonus} weaponBonuses={selectedFeatBonuses.weaponBonuses} inventory={inventory} coins={coins} onInventoryChange={setInventory} onCoinsChange={setCoins} /></div>}
      {activeTab === "spells" && (spellcastingClassIds.length > 0 ? <div className="spell-workspace">{spellcastingClassIds.length > 1 && <label className="spell-class-selector">Spellcasting class<select aria-label="Spellcasting class" value={activeSpellClassId} onChange={(event) => setActiveSpellClassId(event.target.value)}>{spellcastingClassIds.map((castingClassId) => <option key={castingClassId} value={castingClassId}>{classes.find((item) => item.id === castingClassId)?.name ?? castingClassId}</option>)}</select></label>}{activeSpellClassId === characterClass.id ? primarySpellbook : activeSpellClassId === secondaryCharacterClass?.id ? secondarySpellbook : extraSpellbook}</div> : <p className="empty-tab">These classes do not cast spells.</p>)}
      {activeTab === "skills" && <SkillAllocation skills={skillEntries} allocatedRanks={allocatedSkillRanks} totalRanks={progression.skillRanks} maximumRanksPerSkill={level} onRankChange={updateSkill} />}
      {activeTab === "feats" && <FeatChoices feats={feats} choices={featChoices} selectedFeatIds={selectedFeatIds} selectedFeatChoices={selectedFeatChoices} onFeatChange={updateFeat} onFeatChoiceChange={updateFeatChoice} />}
      {activeTab === "features" && <div className="feature-workspace"><ClassFeatures level={level} className={additionalClassLevels.length > 0 ? classLevels.map((entry) => `${classes.find((item) => item.id === entry.classId)?.name ?? entry.classId} ${entry.level}`).join(" / ") : characterClass.name} features={progression.features} dailyResources={classDailyResources} />{classOptionChoices.length > 0 && <ClassOptions choices={classOptionChoices} selectedOptions={selectedOptions} classLevel={primaryClassLevel} charismaModifier={combat.abilityModifiers.charisma} onOptionChange={updateClassOption} />}</div>}
      {activeTab === "options" && <TraitChoices traits={traits} spells={spells} classes={classes} classId={characterClass.id} selectedTraitIds={selectedTraitIds} selectedTraitChoices={selectedTraitChoices} onChange={updateTrait} onChoiceChange={updateTraitChoice} />}
    </section>
  </main>;
}
