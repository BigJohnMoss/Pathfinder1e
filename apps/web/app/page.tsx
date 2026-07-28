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
  const [characterLibrary, setCharacterLibrary] = useState<CharacterLibraryV1>(emptyCharacterLibrary);

  const baseCharacterClass = classes.find((item) => item.id === classId) ?? classes[0];
  const availableArchetypes = archetypes.filter((item) => item.classId === baseCharacterClass.id);
  const selectedArchetype = availableArchetypes.find((item) => item.id === archetypeId);
  const characterClass = useMemo(() => applyArchetype(baseCharacterClass, selectedArchetype), [baseCharacterClass, selectedArchetype]);
  const additionalCharacterClasses = useMemo(() => additionalClassLevels.map((entry) => classes.find((item) => item.id === entry.classId)).filter((item): item is typeof classes[number] => Boolean(item)), [additionalClassLevels]);
  const secondaryClassId = additionalClassLevels[0]?.classId ?? "";
  const secondaryClassLevel = additionalClassLevels[0]?.level ?? 0;
  const secondaryCharacterClass = classes.find((item) => item.id === secondaryClassId);
  const assignedAdditionalLevels = additionalClassLevels.reduce((total, entry) => total + entry.level, 0);
  const primaryClassLevel = level - assignedAdditionalLevels;
  const classLevels = useMemo(() => [{ classId: characterClass.id, level: primaryClassLevel }, ...additionalClassLevels], [additionalClassLevels, characterClass.id, primaryClassLevel]);
  const progressionClasses = useMemo(() => [characterClass, ...additionalCharacterClasses], [additionalCharacterClasses, characterClass]);
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
      ? multiclassProgression(progressionClasses, [{ classId: characterClass.id, level: primaryClassLevel + 1 }, ...additionalClassLevels], options)
      : classProgression(characterClass, level + 1, options);
  }, [abilities.intelligence, additionalCharacterClasses.length, additionalClassLevels, ancestry, ancestryBonusFeats, characterClass, level, primaryClassLevel, progressionClasses]);
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
  const selectedClassFeatIds = useMemo(() => Object.values(selectedOptions).flatMap((optionId) => {
    const option = optionGroups.flatMap((group) => group.options).find((candidate) => candidate.id === optionId);
    return option?.featId ? [option.featId] : [];
  }), [selectedOptions]);
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
  const featContext = useMemo(() => ({ classId: characterClass.id, classLevels: classLevelMap, ancestryId, size: ancestry.size, classLevel: level, casterLevel, abilities, baseAttackBonus: progression.baseAttackBonus, skillRanks, featureIds: progression.features.map((feature) => feature.id), selectedFeatChoices }), [abilities, ancestry.size, ancestryId, casterLevel, characterClass.id, classLevelMap, level, progression.baseAttackBonus, progression.features, selectedFeatChoices, skillRanks]);
  const featChoices = featSlots.map((slot) => { const selected = feats.find((feat) => feat.id === selectedFeatIds[slot.index]); const otherFeatIds = selectedFeatIds.filter((_, index) => index !== slot.index); const context = { ...featContext, candidateId: selected?.id, selectedIds: otherFeatIds }; const checks = selected ? featPrerequisiteResults(selected, context) : []; return { ...slot, selected, checks, eligibleFeatIds: feats.filter((feat) => prerequisitesMet(feat.prerequisites, { ...context, candidateId: feat.id })).map((feat) => feat.id) }; });
  useEffect(() => setSelectedFeatIds((current) => { const next = normalizeSelectedFeats(current, feats, featContext, featSlots.length); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [featContext, featSlots.length]);
  useEffect(() => setSelectedFeatChoices((current) => { const next = normalizeSelectedFeatChoices(current, selectedFeatIds, feats); return Object.keys(next).length === Object.keys(current).length && Object.entries(next).every(([id, choice]) => current[id] === choice) ? current : next; }), [selectedFeatIds]);
  useEffect(() => setSelectedTraitChoices((current) => {
    const next = normalizeSelectedTraitChoices(current, selectedTraitIds, traits, { spells, classes, classId });
    return Object.keys(next).length === Object.keys(current).length && Object.entries(next).every(([id, choice]) => current[id] === choice) ? current : next;
  }), [classId, selectedTraitIds]);

  const updateAbility = (ability: keyof typeof defaultAbilities, value: number) => setBaseAbilities((current) => ({ ...current, [ability]: Math.max(7, Math.min(18, value || 7)) }));
  const updateAbilityBoost = (index: number, ability: keyof typeof defaultAbilities) => setAbilityBoosts(current => current.map((value, boostIndex) => boostIndex === index ? ability : value));
  const updateFeat = (index: number, featId: string) => setSelectedFeatIds((current) => { const next = [...current]; next[index] = featId; return next; });
  const updateFeatChoice = (featId: string, choice: string) => setSelectedFeatChoices((current) => ({ ...current, [featId]: choice }));
  const skillBudget = skillRankBudget(progression.skillRanks, skillRanks);
  const allocatedSkillRanks = skillBudget.allocated;
  const updateSkill = (skillName: string, ranks: number) => setSkillRanks((current) => { const otherRanks = Object.fromEntries(Object.entries(current).filter(([skill]) => skill !== skillName)); const available = skillRankBudget(progression.skillRanks, otherRanks).remaining; return { ...current, [skillName]: Math.max(0, Math.min(level, available, ranks || 0)) }; });
  const skillEntries = skills.map((skill) => { const ranks = skillRanks[skill.name] ?? 0; const result = skillTotal(skillCharacterClass, skill, abilities[skill.ability], ranks); return { ...skill, ranks, ...result, total: result.total + (selectedTraitBonuses.skillBonuses[skill.name] ?? 0) + (selectedFeatBonuses.skillBonuses[skill.name] ?? 0) }; });
  useEffect(() => setSkillRanks((current) => {
    const next = normalizeSkillRanks(current, progression.skillRanks, level);
    return Object.keys(next).length === Object.keys(current).length && Object.entries(next).every(([skill, ranks]) => current[skill] === ranks) ? current : next;
  }), [level, progression.skillRanks]);

  const choiceFeatures = progression.features.filter((feature) => feature.choiceRequired && feature.optionGroupId);
  const classOptionChoices = choiceFeatures.map((feature) => {
    const group = optionGroups.find((item) => item.id === feature.optionGroupId);
    const selectedIds = [...selectedFeatIds, ...Object.values(selectedOptions)];
    const featureClassId = "classId" in feature && typeof feature.classId === "string" ? feature.classId : characterClass.id;
    const featureClassLevel = classLevelMap[featureClassId] ?? primaryClassLevel;
    const options = group && featureClassId === "druid" && group.id === "ranger-animal-companions"
      ? group.options.filter((option) => option.minimumLevel <= featureClassLevel)
      : group && featureClassId === "druid" && group.id === "cleric-domains"
        ? group.options.filter((option) => ["domain-air", "domain-animal", "domain-earth", "domain-fire", "domain-plant", "domain-water", "domain-weather"].includes(option.id))
        : group ? availableOptions(group, featureClassId, featureClassLevel, selectedIds, { abilities, baseAttackBonus: progression.baseAttackBonus, classLevels: classLevelMap, featureIds: [...progression.features.map((entry) => entry.id), ...selectedIds] }) : [];
    return { id: feature.id, name: feature.name, level: feature.level, classLevel: featureClassLevel, options, selected: options.find((option) => option.id === selectedOptions[feature.id]) };
  });
  const updateClassOption = (featureId: string, optionId: string) => setSelectedOptions((current) => ({ ...current, [featureId]: optionId }));
  const updateTrait = (index: number, traitId: string) => setSelectedTraitIds((current) => {
    const next = [...current];
    if (traitId) next[index] = traitId;
    else next.splice(index, 1);
    const normalized = normalizeSelectedTraits(next, traits);
    setSelectedTraitChoices((choices) => normalizeSelectedTraitChoices(choices, normalized, traits, { spells, classes, classId }));
    return normalized;
  });
  const updateTraitChoice = (traitId: string, choice: string) => setSelectedTraitChoices((current) => normalizeSelectedTraitChoices({ ...current, [traitId]: choice }, selectedTraitIds, traits, { spells, classes, classId }));

  const castingAbility = characterClass.spellcasting && abilityNames.includes(characterClass.spellcasting.ability as keyof typeof abilities) ? characterClass.spellcasting.ability as keyof typeof abilities : null;
  const castingAbilityScore = castingAbility ? abilities[castingAbility] : 10;
  const isSpontaneous = characterClass.spellcasting?.castingType === "spontaneous";
  const preparedCasting = useMemo(() => characterClass.spellcasting && !isSpontaneous ? spellcastingProgression(characterClass, primaryClassLevel, { abilityScore: castingAbilityScore }) : null, [castingAbilityScore, characterClass, isSpontaneous, primaryClassLevel]);
  const spontaneousCasting = useMemo(() => isSpontaneous ? spontaneousSpellcastingProgression(characterClass, primaryClassLevel, { abilityScore: castingAbilityScore }) : null, [castingAbilityScore, characterClass, isSpontaneous, primaryClassLevel]);
  const spellSlots = useMemo(() => spontaneousCasting?.slots ?? preparedCasting?.slots ?? [], [preparedCasting, spontaneousCasting]);
  const maximumSpellLevel = spontaneousCasting?.maximumSpellLevel ?? preparedCasting?.maximumSpellLevel ?? 0;
  const hasSpellcasting = Boolean(preparedCasting || spontaneousCasting);
  const baseAvailableSpells = useMemo(() => hasSpellcasting ? spellsAvailableToClass(spells, characterClass.id, maximumSpellLevel) : [], [characterClass.id, hasSpellcasting, maximumSpellLevel]);
  const bloodlineSpells = useMemo(() => classId === "sorcerer"
    ? bloodlineBonusSpells(spells, selectedBloodline, primaryClassLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
    : [], [characterClass.id, classId, maximumSpellLevel, primaryClassLevel, selectedBloodline]);
  const mysterySpells = useMemo(() => classId === "oracle"
    ? mysteryBonusSpells(spells, selectedMystery, primaryClassLevel, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
    : [], [characterClass.id, classId, maximumSpellLevel, primaryClassLevel, selectedMystery]);
  const grantedSpells = useMemo(() => [...bloodlineSpells, ...mysterySpells], [bloodlineSpells, mysterySpells]);
  const availableSpells = useMemo(() => mergeSpellLists(baseAvailableSpells, grantedSpells), [baseAvailableSpells, grantedSpells]);
  const grantedSpellIds = useMemo(() => grantedSpells.map((spell) => spell.id), [grantedSpells]);
  const spellDcs = hasSpellcasting ? Object.fromEntries(Array.from({ length: maximumSpellLevel + 1 }, (_, spellLevel) => [spellLevel, spellSaveDC(castingAbilityScore, spellLevel)])) : {};
  const preparedLimits = useMemo(() => preparedCasting?.prepared ?? [], [preparedCasting]);
  const knownLimits = useMemo(() => spontaneousCasting?.known ?? [], [spontaneousCasting]);
  const oppositionSchoolIds = useMemo(() => oppositionSchoolsFromOptions(classId, selectedOptions), [classId, selectedOptions]);
  const secondaryCastingAbility = secondaryCharacterClass?.spellcasting && abilityNames.includes(secondaryCharacterClass.spellcasting.ability as keyof typeof abilities) ? secondaryCharacterClass.spellcasting.ability as keyof typeof abilities : null;
  const secondaryCastingAbilityScore = secondaryCastingAbility ? abilities[secondaryCastingAbility] : 10;
  const secondaryIsSpontaneous = secondaryCharacterClass?.spellcasting?.castingType === "spontaneous";
  const secondaryPreparedCasting = useMemo(() => secondaryCharacterClass?.spellcasting && !secondaryIsSpontaneous ? spellcastingProgression(secondaryCharacterClass, secondaryClassLevel, { abilityScore: secondaryCastingAbilityScore }) : null, [secondaryCastingAbilityScore, secondaryCharacterClass, secondaryClassLevel, secondaryIsSpontaneous]);
  const secondarySpontaneousCasting = useMemo(() => secondaryCharacterClass && secondaryIsSpontaneous ? spontaneousSpellcastingProgression(secondaryCharacterClass, secondaryClassLevel, { abilityScore: secondaryCastingAbilityScore }) : null, [secondaryCastingAbilityScore, secondaryCharacterClass, secondaryClassLevel, secondaryIsSpontaneous]);
  const secondarySpellSlots = useMemo(() => secondarySpontaneousCasting?.slots ?? secondaryPreparedCasting?.slots ?? [], [secondaryPreparedCasting, secondarySpontaneousCasting]);
  const secondaryMaximumSpellLevel = secondarySpontaneousCasting?.maximumSpellLevel ?? secondaryPreparedCasting?.maximumSpellLevel ?? 0;
  const secondaryHasSpellcasting = Boolean(secondaryPreparedCasting || secondarySpontaneousCasting);
  const secondarySelectedBloodline = useMemo(() => secondaryCharacterClass ? bloodlineFromOptions(secondaryCharacterClass.id, selectedOptions) : undefined, [secondaryCharacterClass, selectedOptions]);
  const secondarySelectedMystery = useMemo(() => secondaryCharacterClass ? mysteryFromOptions(secondaryCharacterClass.id, selectedOptions) : undefined, [secondaryCharacterClass, selectedOptions]);
  const secondaryBaseSpells = useMemo(() => secondaryHasSpellcasting && secondaryCharacterClass ? spellsAvailableToClass(spells, secondaryCharacterClass.id, secondaryMaximumSpellLevel) : [], [secondaryCharacterClass, secondaryHasSpellcasting, secondaryMaximumSpellLevel]);
  const secondaryBloodlineSpells = useMemo(() => secondaryCharacterClass?.id === "sorcerer"
    ? bloodlineBonusSpells(spells, secondarySelectedBloodline, secondaryClassLevel, secondaryCharacterClass.id).filter((spell) => spell.levelByClass[secondaryCharacterClass.id] <= secondaryMaximumSpellLevel)
    : [], [secondaryCharacterClass, secondaryClassLevel, secondaryMaximumSpellLevel, secondarySelectedBloodline]);
  const secondaryMysterySpells = useMemo(() => secondaryCharacterClass?.id === "oracle"
    ? mysteryBonusSpells(spells, secondarySelectedMystery, secondaryClassLevel, secondaryCharacterClass.id).filter((spell) => spell.levelByClass[secondaryCharacterClass.id] <= secondaryMaximumSpellLevel)
    : [], [secondaryCharacterClass, secondaryClassLevel, secondaryMaximumSpellLevel, secondarySelectedMystery]);
  const secondaryGrantedSpells = useMemo(() => [...secondaryBloodlineSpells, ...secondaryMysterySpells], [secondaryBloodlineSpells, secondaryMysterySpells]);
  const secondaryAvailableSpells = useMemo(() => mergeSpellLists(secondaryBaseSpells, secondaryGrantedSpells), [secondaryBaseSpells, secondaryGrantedSpells]);
  const secondaryGrantedSpellIds = useMemo(() => secondaryGrantedSpells.map((spell) => spell.id), [secondaryGrantedSpells]);
  const secondaryPreparedLimits = useMemo(() => secondaryPreparedCasting?.prepared ?? [], [secondaryPreparedCasting]);
  const secondaryKnownLimits = useMemo(() => secondarySpontaneousCasting?.known ?? [], [secondarySpontaneousCasting]);
  const secondarySpellDcs = secondaryHasSpellcasting ? Object.fromEntries(Array.from({ length: secondaryMaximumSpellLevel + 1 }, (_, spellLevel) => [spellLevel, spellSaveDC(secondaryCastingAbilityScore, spellLevel)])) : {};
  const secondaryOppositionSchoolIds = useMemo(() => oppositionSchoolsFromOptions(secondaryCharacterClass?.id ?? "", selectedOptions), [secondaryCharacterClass, selectedOptions]);
  const reservoir = classId === "arcanist" ? arcaneReservoir(primaryClassLevel) : null;
  const secondaryReservoir = secondaryCharacterClass?.id === "arcanist" ? arcaneReservoir(secondaryClassLevel) : null;
  const bardClassLevel = classLevelMap.bard ?? 0;
  const druidClassLevel = classLevelMap.druid ?? 0;
  const bardicPerformanceMaximum = bardClassLevel > 0 ? bardicPerformanceRounds(bardClassLevel, combat.abilityModifiers.charisma) : 0;
  const wildShapeMaximum = druidClassLevel > 0 ? druidWildShapeUses(druidClassLevel) : 0;
  const classDailyResources = [
    ...(bardClassLevel > 0 ? [{ label: "Performance rounds", unit: "round", maximum: bardicPerformanceMaximum, used: bardicPerformanceUsed, onUsedChange: setBardicPerformanceUsed }] : []),
    ...(druidClassLevel >= 4 ? [{ label: "Wild Shape", unit: "use", maximum: wildShapeMaximum, used: wildShapeUsed, onUsedChange: setWildShapeUsed }] : [])
  ];
  const updateSpellSlotUses = (uses: Record<number, number>) => setSpellSlotUses(normalizeSpellSlotUses(uses, spellSlots));
  const updateSecondarySpellSlotUses = (uses: Record<number, number>) => setSecondarySpellSlotUses(normalizeSpellSlotUses(uses, secondarySpellSlots));
  const updateReservoir = (points: number) => setReservoirPoints(Math.max(0, Math.min(reservoir?.maximum ?? 0, points)));
  const updateSecondaryReservoir = (points: number) => setReservoirPoints(Math.max(0, Math.min(secondaryReservoir?.maximum ?? 0, points)));
  const refreshDay = () => { setSpellSlotUses({}); if (reservoir) setReservoirPoints(reservoir.dailyRefresh); if (classId === "bard") setBardicPerformanceUsed(0); if (classId === "druid") setWildShapeUsed(0); };
  const refreshSecondaryDay = () => { setSecondarySpellSlotUses({}); if (secondaryReservoir) setReservoirPoints(secondaryReservoir.dailyRefresh); if (secondaryCharacterClass?.id === "bard") setBardicPerformanceUsed(0); if (secondaryCharacterClass?.id === "druid") setWildShapeUsed(0); };
  const normalizeSelectedSpells = (spellIds: string[]) => isSpontaneous
    ? normalizeKnownSpells(spellIds, availableSpells, characterClass.id, knownLimits, grantedSpellIds)
    : normalizePreparedSpellsWithOpposition(spellIds, availableSpells, characterClass.id, preparedLimits, oppositionSchoolIds);
  const updateSelectedSpells = (spellIds: string[]) => setSelectedSpellIds(normalizeSelectedSpells(spellIds));
  const normalizeSecondarySelectedSpells = (spellIds: string[]) => !secondaryCharacterClass ? [] : secondaryIsSpontaneous
    ? normalizeKnownSpells(spellIds, secondaryAvailableSpells, secondaryCharacterClass.id, secondaryKnownLimits, secondaryGrantedSpellIds)
    : normalizePreparedSpellsWithOpposition(spellIds, secondaryAvailableSpells, secondaryCharacterClass.id, secondaryPreparedLimits, secondaryOppositionSchoolIds);
  const updateSecondarySelectedSpells = (spellIds: string[]) => setSecondarySelectedSpellIds(normalizeSecondarySelectedSpells(spellIds));
  useEffect(() => setSelectedSpellIds((current) => { const next = normalizeSelectedSpells(current); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [availableSpells, grantedSpellIds, characterClass.id, isSpontaneous, knownLimits, oppositionSchoolIds, preparedLimits]);
  useEffect(() => setSpellSlotUses((current) => normalizeSpellSlotUses(current, spellSlots)), [spellSlots]);
  useEffect(() => setSecondarySelectedSpellIds((current) => { const next = normalizeSecondarySelectedSpells(current); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [secondaryAvailableSpells, secondaryCharacterClass?.id, secondaryGrantedSpellIds, secondaryIsSpontaneous, secondaryKnownLimits, secondaryOppositionSchoolIds, secondaryPreparedLimits]);
  useEffect(() => setSecondarySpellSlotUses((current) => normalizeSpellSlotUses(current, secondarySpellSlots)), [secondarySpellSlots]);
  const spellcastingClassIds = useMemo(() => progressionClasses.filter((item) => item.spellcasting && (classLevelMap[item.id] ?? 0) > 0).map((item) => item.id), [classLevelMap, progressionClasses]);
  useEffect(() => setActiveSpellClassId((current) => spellcastingClassIds.includes(current) ? current : spellcastingClassIds[0] ?? ""), [spellcastingClassIds]);
  useEffect(() => { if (reservoir) setReservoirPoints((current) => Math.min(current, reservoir.maximum)); }, [reservoir?.maximum]);
  useEffect(() => setBardicPerformanceUsed((current) => Math.min(current, bardicPerformanceMaximum)), [bardicPerformanceMaximum]);
  useEffect(() => setWildShapeUsed((current) => wildShapeMaximum === null ? 0 : Math.min(current, wildShapeMaximum)), [wildShapeMaximum]);

  const primarySpellbook = spontaneousCasting ? <SpontaneousSpellbook key={characterClass.id} spells={availableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={characterClass.id} className={characterClass.name} castingAbilityName={castingAbility ? labels[castingAbility] : "casting ability"} slots={spontaneousCasting.slots} knownLimits={knownLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} knownSpellIds={selectedSpellIds} grantedSpellIds={grantedSpellIds} onKnownSpellIdsChange={updateSelectedSpells} slotUses={spellSlotUses} onSlotUsesChange={updateSpellSlotUses} onRefreshDay={refreshDay} /> : preparedCasting ? <Spellbook key={characterClass.id} spells={availableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={characterClass.id} className={characterClass.name} castingAbilityName={castingAbility ? labels[castingAbility] : "casting ability"} slots={preparedCasting.slots} preparedLimits={preparedLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} preparedSpellIds={selectedSpellIds} onPreparedSpellIdsChange={updateSelectedSpells} slotUses={spellSlotUses} onSlotUsesChange={updateSpellSlotUses} reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null} onReservoirChange={updateReservoir} onRefreshDay={refreshDay} oppositionSchoolIds={oppositionSchoolIds} /> : null;
  const secondarySpellbook = secondaryCharacterClass && secondarySpontaneousCasting ? <SpontaneousSpellbook key={secondaryCharacterClass.id} spells={secondaryAvailableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={secondaryCharacterClass.id} className={secondaryCharacterClass.name} castingAbilityName={secondaryCastingAbility ? labels[secondaryCastingAbility] : "casting ability"} slots={secondarySpontaneousCasting.slots} knownLimits={secondaryKnownLimits} spellDcs={secondarySpellDcs} maximumSpellLevel={secondaryMaximumSpellLevel} knownSpellIds={secondarySelectedSpellIds} grantedSpellIds={secondaryGrantedSpellIds} onKnownSpellIdsChange={updateSecondarySelectedSpells} slotUses={secondarySpellSlotUses} onSlotUsesChange={updateSecondarySpellSlotUses} onRefreshDay={refreshSecondaryDay} /> : secondaryCharacterClass && secondaryPreparedCasting ? <Spellbook key={secondaryCharacterClass.id} spells={secondaryAvailableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={secondaryCharacterClass.id} className={secondaryCharacterClass.name} castingAbilityName={secondaryCastingAbility ? labels[secondaryCastingAbility] : "casting ability"} slots={secondaryPreparedCasting.slots} preparedLimits={secondaryPreparedLimits} spellDcs={secondarySpellDcs} maximumSpellLevel={secondaryMaximumSpellLevel} preparedSpellIds={secondarySelectedSpellIds} onPreparedSpellIdsChange={updateSecondarySelectedSpells} slotUses={secondarySpellSlotUses} onSlotUsesChange={updateSecondarySpellSlotUses} reservoir={secondaryReservoir ? { current: reservoirPoints, ...secondaryReservoir } : null} onReservoirChange={updateSecondaryReservoir} onRefreshDay={refreshSecondaryDay} oppositionSchoolIds={secondaryOppositionSchoolIds} /> : null;
  const extraActiveClassLevel = additionalClassLevels.slice(1).find((entry) => entry.classId === activeSpellClassId);
  const extraActiveClass = extraActiveClassLevel ? classes.find((item) => item.id === extraActiveClassLevel.classId) : undefined;
  const extraSpellbook = extraActiveClass && extraActiveClassLevel ? <ClassSpellbook key={extraActiveClass.id} characterClass={extraActiveClass} classLevel={extraActiveClassLevel.level} abilities={abilities} selectedOptions={selectedOptions} spellTraitBonuses={selectedTraitBonuses.spellBonuses} selectedSpellIds={extraSelectedSpellsByClass[extraActiveClass.id] ?? []} onSelectedSpellIdsChange={(spellIds) => setExtraSelectedSpellsByClass((current) => ({ ...current, [extraActiveClass.id]: spellIds }))} slotUses={extraSpellSlotUsesByClass[extraActiveClass.id] ?? {}} onSlotUsesChange={(uses) => setExtraSpellSlotUsesByClass((current) => ({ ...current, [extraActiveClass.id]: uses }))} reservoirPoints={reservoirPoints} onReservoirPointsChange={setReservoirPoints} /> : null;

  const preparedSpellsByClass = Object.fromEntries(classLevels.map((entry, index) => [entry.classId, index === 0 ? selectedSpellIds : index === 1 ? secondarySelectedSpellIds : extraSelectedSpellsByClass[entry.classId] ?? []]));
  const spellSlotUsesByClass = Object.fromEntries(classLevels.map((entry, index) => [entry.classId, Object.fromEntries(Object.entries(index === 0 ? spellSlotUses : index === 1 ? secondarySpellSlotUses : extraSpellSlotUsesByClass[entry.classId] ?? {}))]));
  const characterDraft: CharacterDraftV1 = { version: 1, name, classId, classLevels, archetypeId, ancestryId, level, humanAbility, baseAbilities, pointBuyBudget, abilityBoosts, favoredClassHitPoints, favoredClassSkillRanks, selectedFeatIds, selectedTraitIds, selectedTraitChoices, selectedFeatChoices, skillRanks, selectedOptions, preparedSpells: selectedSpellIds, preparedSpellsByClass, spellSlotUses: Object.fromEntries(Object.entries(spellSlotUses)), spellSlotUsesByClass, arcaneReservoir: classLevelMap.arcanist ? reservoirPoints : null, bardicPerformanceUsed: bardClassLevel > 0 ? bardicPerformanceUsed : 0, wildShapeUsed: druidClassLevel > 0 ? wildShapeUsed : 0, currentHitPoints, temporaryHitPoints, activeEffects, inventory, coins };
  useEffect(() => {
    try {
      const stored = localStorage.getItem(characterLibraryKey);
      const library = stored ? normalizeCharacterLibrary(JSON.parse(stored)) : emptyCharacterLibrary();
      const legacy = localStorage.getItem(legacyCharacterKey);
      if (library.characters.length === 0 && legacy) {
        const draft = normalizeCharacterDraft(JSON.parse(legacy), { classIds: classes.map((item) => item.id), ancestryIds: ancestries.map((item) => item.id), archetypeIds: archetypes.map((item) => item.id) });
        if (draft) {
          const id = globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`;
          const migrated = { version: 1 as const, activeCharacterId: id, characters: [{ id, updatedAt: new Date().toISOString(), draft }] };
          localStorage.setItem(characterLibraryKey, JSON.stringify(migrated));
          setCharacterLibrary(migrated);
          setSaveNotice("Your previous save was added to the character library");
          return;
        }
      }
      setCharacterLibrary(library);
    } catch {
      setSaveNotice("Saved character library is invalid; starting with an empty library");
    }
  }, []);
  const persistLibrary = (library: CharacterLibraryV1) => {
    localStorage.setItem(characterLibraryKey, JSON.stringify(library));
    setCharacterLibrary(library);
  };
  const applyCharacterDraft = (value: unknown, successNotice: string) => {
    if (value && typeof value === "object" && "version" in value && value.version !== 1) { setSaveNotice("Unsupported character file version"); return null; }
    const draft = normalizeCharacterDraft(value, { classIds: classes.map((item) => item.id), ancestryIds: ancestries.map((item) => item.id), archetypeIds: archetypes.filter((item) => item.classId === (value as { classId?: string })?.classId).map((item) => item.id) });
    if (!draft) { setSaveNotice("Character file is invalid"); return null; }
    const draftClass = classes.find((item) => item.id === draft.classId) ?? classes[0];
    const draftPrimaryLevel = draft.classLevels[0]?.level ?? draft.level;
    const draftSecondaryLevel = draft.classLevels[1];
    const draftSecondaryClass = classes.find((item) => item.id === draftSecondaryLevel?.classId);
    const draftAncestry = ancestries.find((item) => item.id === draft.ancestryId) ?? ancestries[0];
    const draftFixedModifiers = (draftAncestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {};
    const draftChoiceAmount = (draftAncestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
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
    setName(draft.name); setClassId(draft.classId); setAdditionalClassLevels(draft.classLevels.slice(1)); setArchetypeId(draft.archetypeId); setAncestryId(draft.ancestryId); setLevel(draft.level); setHumanAbility(draft.humanAbility); setBaseAbilities(draft.baseAbilities); setPointBuyBudget(draft.pointBuyBudget); setAbilityBoosts(draft.abilityBoosts); setFavoredClassHitPoints(draft.favoredClassHitPoints); setFavoredClassSkillRanks(draft.favoredClassSkillRanks); setSelectedFeatIds(draft.selectedFeatIds); setSelectedTraitIds(draftTraitIds); setSelectedTraitChoices(normalizeSelectedTraitChoices(draft.selectedTraitChoices, draftTraitIds, traits, { spells, classes, classId: draft.classId })); setSelectedFeatChoices(normalizeSelectedFeatChoices(draft.selectedFeatChoices, draft.selectedFeatIds, feats)); setSkillRanks(draft.skillRanks); setSelectedOptions(draft.selectedOptions); setSelectedSpellIds(normalizedDraftSpells); setSecondarySelectedSpellIds(normalizedDraftSecondarySpells); setExtraSelectedSpellsByClass(Object.fromEntries(draft.classLevels.slice(2).map((entry) => [entry.classId, draft.preparedSpellsByClass[entry.classId] ?? []]))); setSpellSlotUses(normalizeSpellSlotUses(draft.spellSlotUsesByClass[draft.classId] ?? draft.spellSlotUses, draftCasting?.slots ?? [])); setSecondarySpellSlotUses(normalizeSpellSlotUses(draftSecondaryClass ? draft.spellSlotUsesByClass[draftSecondaryClass.id] ?? {} : {}, draftSecondaryCasting?.slots ?? [])); setExtraSpellSlotUsesByClass(Object.fromEntries(draft.classLevels.slice(2).map((entry) => [entry.classId, Object.fromEntries(Object.entries(draft.spellSlotUsesByClass[entry.classId] ?? {}).map(([spellLevel, uses]) => [Number(spellLevel), uses]))]))); setReservoirPoints(draftAnyReservoir ? Math.min(draft.arcaneReservoir ?? draftAnyReservoir.dailyRefresh, draftAnyReservoir.maximum) : 0); setBardicPerformanceUsed(Math.min(draft.bardicPerformanceUsed, draftBardicPerformanceMaximum)); setWildShapeUsed(draftWildShapeMaximum === null ? 0 : Math.min(draft.wildShapeUsed, draftWildShapeMaximum)); setCurrentHitPoints(draft.currentHitPoints); setTemporaryHitPoints(draft.temporaryHitPoints); setActiveEffects(draft.activeEffects); setInventory(draft.inventory); setCoins(draft.coins); setSaveNotice(successNotice);
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
  const resetCharacter = () => { localStorage.removeItem(legacyCharacterKey); setName(""); setClassId("arcanist"); setAdditionalClassLevels([]); setArchetypeId(""); setAncestryId("human"); setLevel(1); setHumanAbility("intelligence"); setBaseAbilities(defaultAbilities); setPointBuyBudget(15); setAbilityBoosts([]); setFavoredClassHitPoints(0); setFavoredClassSkillRanks(0); setSelectedFeatIds([]); setSelectedTraitIds([]); setSelectedTraitChoices({}); setSelectedFeatChoices({}); setSkillRanks({}); setSelectedOptions({}); setSelectedSpellIds([]); setSecondarySelectedSpellIds([]); setExtraSelectedSpellsByClass({}); setSpellSlotUses({}); setSecondarySpellSlotUses({}); setExtraSpellSlotUsesByClass({}); setActiveSpellClassId(""); setReservoirPoints(3); setBardicPerformanceUsed(0); setWildShapeUsed(0); setCurrentHitPoints(null); setTemporaryHitPoints(0); setActiveEffects([]); setInventory([]); setCoins({ cp: 0, sp: 0, gp: 0, pp: 0 }); setSaveNotice("Character reset"); };
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
    <CharacterDetails name={name} classId={classId} additionalClassLevels={additionalClassLevels} archetypeId={archetypeId} ancestryId={ancestryId} level={level} classes={classes} archetypes={availableArchetypes} ancestries={ancestries} saveNotice={saveNotice} onNameChange={setName} onClassChange={(next) => { setClassId(next); setArchetypeId(""); }} onAdditionalClassLevelsChange={(next) => { setAdditionalClassLevels(next); if (next.length > 0 && level < next.length + 1) setLevel(next.length + 1); }} onArchetypeChange={setArchetypeId} onAncestryChange={setAncestryId} onLevelChange={(next) => { setLevel(next); setShowLevelUp(false); }} onReviewLevelUp={() => setShowLevelUp(true)} onSave={saveCharacter} onLoad={loadCharacter} onImport={importCharacter} onExport={exportCharacter} onPrint={printCharacter} onReset={resetCharacter} />
    {showLevelUp && level < 20 && <LevelUpPanel currentLevel={level} className={characterClass.name} gains={levelUpGains} onCancel={() => setShowLevelUp(false)} onConfirm={() => { setLevel(level + 1); setShowLevelUp(false); setSaveNotice(`Advanced to level ${level + 1}. Review newly unlocked choices.`); }} />}
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
