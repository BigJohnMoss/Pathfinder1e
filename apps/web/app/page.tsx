"use client";

import { useEffect, useMemo, useState } from "react";
import { ancestries, archetypes, classes, feats, optionGroups, skills, spells, traits } from "./character-catalogue";
import { AbilityEditor } from "./ability-editor";
import { CharacterDetails } from "./character-details";
import { ClassFeatures } from "./class-features";
import { Spellbook } from "./spellbook";
import { SpontaneousSpellbook } from "./spontaneous-spellbook";
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
import { abilityBoostCount, abilityNames, applyArchetype, arcaneReservoir, availableOptions, bardicPerformanceRounds, characterCombatStats, classProgression, druidWildShapeUses, featBonuses, featPrerequisiteResults, normalizeAbilityBoosts, normalizeCharacterDraft, normalizeSelectedFeatChoices, normalizeSelectedFeats, normalizeSelectedTraitChoices, normalizeSelectedTraits, normalizeSkillRanks, normalizeSpellSlotUses, pointBuySummary, prerequisitesMet, skillRankBudget, skillTotal, spellSaveDC, spellcastingProgression, spellsAvailableToClass, traitBonuses } from "../../../packages/engine/src/index.js";
import { normalizePreparedSpellsWithOpposition } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import { normalizeKnownSpells, spontaneousSpellcastingProgression } from "../../../packages/engine/src/spontaneous-spellcasting.js";
import { bloodlineBonusSpells, bloodlineClassSkills } from "../../../packages/engine/src/sorcerer-bloodlines.js";
import type { ActiveEffect, CharacterDraftV1 } from "../../../packages/types/src/index.js";

const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const defaultAbilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const wizardOppositionFeatureIds = ["wizard-opposition-school-1-first", "wizard-opposition-school-1-second"] as const;
const oppositionSchoolsFromOptions = (selectedClassId: string, options: Record<string, string>) => selectedClassId === "wizard"
  ? wizardOppositionFeatureIds.map((featureId) => options[featureId]).filter((id): id is string => typeof id === "string" && id.length > 0)
  : [];
const bloodlineFromOptions = (selectedClassId: string, options: Record<string, string>) => selectedClassId === "sorcerer"
  ? optionGroups.find((group) => group.id === "sorcerer-bloodlines")?.options.find((option) => option.id === options["sorcerer-bloodline-1"])
  : undefined;

function mergeSpellLists<T extends { id: string }>(baseSpells: T[], grantedSpells: T[]) {
  const byId = new Map(baseSpells.map((spell) => [spell.id, spell]));
  for (const spell of grantedSpells) byId.set(spell.id, spell);
  return [...byId.values()];
}

export default function Home() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("arcanist");
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
  const ancestry = ancestries.find((item) => item.id === ancestryId) ?? ancestries[0];
  const selectedTraitBonuses = useMemo(() => traitBonuses(selectedTraitIds, traits, selectedTraitChoices, { spells, classes, classId }), [classId, selectedTraitChoices, selectedTraitIds]);
  const selectedBloodline = useMemo(() => bloodlineFromOptions(classId, selectedOptions), [classId, selectedOptions]);
  const selectedBloodlineClassSkill = selectedOptions["sorcerer-bloodline-class-skill"];
  const skillCharacterClass = useMemo(() => {
    const bloodlineSkills = selectedBloodline?.classSkill
      ? bloodlineClassSkills(characterClass.classSkills, selectedBloodline, selectedBloodlineClassSkill)
      : characterClass.classSkills;
    return { ...characterClass, classSkills: [...new Set([...bloodlineSkills, ...selectedTraitBonuses.classSkills])] };
  }, [characterClass, selectedBloodline, selectedBloodlineClassSkill, selectedTraitBonuses.classSkills]);
  const fixedModifiers = (ancestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {};
  const choiceAmount = (ancestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
  const abilities = useMemo(() => Object.fromEntries(Object.keys(baseAbilities).map((ability) => [ability, baseAbilities[ability as keyof typeof baseAbilities] + (fixedModifiers[ability as keyof typeof baseAbilities] ?? 0) + (choiceAmount && ability === humanAbility ? choiceAmount : 0) + abilityBoosts.filter(boost => boost === ability).length])) as typeof baseAbilities, [abilityBoosts, baseAbilities, choiceAmount, fixedModifiers, humanAbility]);
  const pointBuy = pointBuySummary(baseAbilities, pointBuyBudget);
  useEffect(() => setAbilityBoosts(current => { const next = normalizeAbilityBoosts(current, level); while (next.length < abilityBoostCount(level)) next.push("strength"); return next; }), [level]);
  useEffect(() => {
    setFavoredClassHitPoints(current => Math.min(current, level));
    setFavoredClassSkillRanks(current => Math.min(current, Math.max(0, level - favoredClassHitPoints)));
  }, [favoredClassHitPoints, level]);
  const ancestryBonusFeats = ancestry.traits.some((trait) => trait.id === "human-bonus-feat") ? 1 : 0;
  const progression = useMemo(() => {
    const base = classProgression(characterClass, level, {
      intelligenceScore: abilities.intelligence,
      racialSkillBonusPerLevel: ancestry.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
      bonusFeats: ancestryBonusFeats
    });
    return { ...base, skillRanks: base.skillRanks + favoredClassSkillRanks };
  }, [abilities.intelligence, ancestry, ancestryBonusFeats, characterClass, favoredClassSkillRanks, level]);
  const nextProgression = useMemo(() => level < 20 ? classProgression(characterClass, level + 1, {
    intelligenceScore: abilities.intelligence,
    racialSkillBonusPerLevel: ancestry.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
    bonusFeats: ancestryBonusFeats
  }) : null, [abilities.intelligence, ancestry, ancestryBonusFeats, characterClass, level]);
  const baseCombat = useMemo(() => characterCombatStats(characterClass, level, abilities), [abilities, characterClass, level]);
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
    const gains = nextProgression.features.filter((feature) => feature.level === level + 1).map((feature) => `${feature.name}: ${feature.summary}`);
    const featGain = nextProgression.featSlots - progression.featSlots;
    const skillGain = nextProgression.skillRanks - progression.skillRanks;
    if (abilityBoostCount(level + 1) > abilityBoostCount(level)) gains.push("Choose a +1 increase to one ability score.");
    if (featGain > 0) gains.push(`Choose ${featGain} new feat${featGain === 1 ? "" : "s"}.`);
    if (skillGain > 0) gains.push(`Allocate ${skillGain} new skill rank${skillGain === 1 ? "" : "s"}.`);
    return gains;
  }, [level, nextProgression, progression.featSlots, progression.skillRanks]);
  const featContext = useMemo(() => ({ classId: characterClass.id, ancestryId, size: ancestry.size, classLevel: level, casterLevel: characterClass.spellcasting ? level : 0, abilities, baseAttackBonus: progression.baseAttackBonus, skillRanks, featureIds: progression.features.map((feature) => feature.id), selectedFeatChoices }), [abilities, ancestry.size, ancestryId, characterClass, level, progression.baseAttackBonus, progression.features, selectedFeatChoices, skillRanks]);
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
  const classOptionChoices = choiceFeatures.map((feature) => { const group = optionGroups.find((item) => item.id === feature.optionGroupId); const selectedIds = [...selectedFeatIds, ...Object.values(selectedOptions)]; const options = group && characterClass.id === "druid" && group.id === "ranger-animal-companions" ? group.options.filter((option) => option.minimumLevel <= level) : group && characterClass.id === "druid" && group.id === "cleric-domains" ? group.options.filter((option) => ["domain-air", "domain-animal", "domain-earth", "domain-fire", "domain-plant", "domain-water", "domain-weather"].includes(option.id)) : group ? availableOptions(group, characterClass.id, level, selectedIds, { abilities, baseAttackBonus: progression.baseAttackBonus, featureIds: selectedIds }) : []; return { id: feature.id, name: feature.name, level: feature.level, options, selected: options.find((option) => option.id === selectedOptions[feature.id]) }; });
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
  const preparedCasting = useMemo(() => characterClass.spellcasting && !isSpontaneous ? spellcastingProgression(characterClass, level, { abilityScore: castingAbilityScore }) : null, [castingAbilityScore, characterClass, isSpontaneous, level]);
  const spontaneousCasting = useMemo(() => isSpontaneous ? spontaneousSpellcastingProgression(characterClass, level, { abilityScore: castingAbilityScore }) : null, [castingAbilityScore, characterClass, isSpontaneous, level]);
  const spellSlots = useMemo(() => spontaneousCasting?.slots ?? preparedCasting?.slots ?? [], [preparedCasting, spontaneousCasting]);
  const maximumSpellLevel = spontaneousCasting?.maximumSpellLevel ?? preparedCasting?.maximumSpellLevel ?? 0;
  const hasSpellcasting = Boolean(preparedCasting || spontaneousCasting);
  const baseAvailableSpells = useMemo(() => hasSpellcasting ? spellsAvailableToClass(spells, characterClass.id, maximumSpellLevel) : [], [characterClass.id, hasSpellcasting, maximumSpellLevel]);
  const bloodlineSpells = useMemo(() => classId === "sorcerer"
    ? bloodlineBonusSpells(spells, selectedBloodline, level, characterClass.id).filter((spell) => spell.levelByClass[characterClass.id] <= maximumSpellLevel)
    : [], [characterClass.id, classId, level, maximumSpellLevel, selectedBloodline]);
  const availableSpells = useMemo(() => mergeSpellLists(baseAvailableSpells, bloodlineSpells), [baseAvailableSpells, bloodlineSpells]);
  const bloodlineSpellIds = useMemo(() => bloodlineSpells.map((spell) => spell.id), [bloodlineSpells]);
  const spellDcs = hasSpellcasting ? Object.fromEntries(Array.from({ length: maximumSpellLevel + 1 }, (_, spellLevel) => [spellLevel, spellSaveDC(castingAbilityScore, spellLevel)])) : {};
  const preparedLimits = useMemo(() => preparedCasting?.prepared ?? [], [preparedCasting]);
  const knownLimits = useMemo(() => spontaneousCasting?.known ?? [], [spontaneousCasting]);
  const oppositionSchoolIds = useMemo(() => oppositionSchoolsFromOptions(classId, selectedOptions), [classId, selectedOptions]);
  const reservoir = classId === "arcanist" ? arcaneReservoir(level) : null;
  const bardicPerformanceMaximum = classId === "bard" ? bardicPerformanceRounds(level, combat.abilityModifiers.charisma) : 0;
  const wildShapeMaximum = classId === "druid" ? druidWildShapeUses(level) : 0;
  const updateSpellSlotUses = (uses: Record<number, number>) => setSpellSlotUses(normalizeSpellSlotUses(uses, spellSlots));
  const updateReservoir = (points: number) => setReservoirPoints(Math.max(0, Math.min(reservoir?.maximum ?? 0, points)));
  const refreshDay = () => { setSpellSlotUses({}); if (reservoir) setReservoirPoints(reservoir.dailyRefresh); if (classId === "bard") setBardicPerformanceUsed(0); if (classId === "druid") setWildShapeUsed(0); };
  const normalizeSelectedSpells = (spellIds: string[]) => isSpontaneous
    ? normalizeKnownSpells(spellIds, availableSpells, characterClass.id, knownLimits, bloodlineSpellIds)
    : normalizePreparedSpellsWithOpposition(spellIds, availableSpells, characterClass.id, preparedLimits, oppositionSchoolIds);
  const updateSelectedSpells = (spellIds: string[]) => setSelectedSpellIds(normalizeSelectedSpells(spellIds));
  useEffect(() => setSelectedSpellIds((current) => { const next = normalizeSelectedSpells(current); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [availableSpells, bloodlineSpellIds, characterClass.id, isSpontaneous, knownLimits, oppositionSchoolIds, preparedLimits]);
  useEffect(() => setSpellSlotUses((current) => normalizeSpellSlotUses(current, spellSlots)), [spellSlots]);
  useEffect(() => { if (reservoir) setReservoirPoints((current) => Math.min(current, reservoir.maximum)); }, [reservoir?.maximum]);
  useEffect(() => setBardicPerformanceUsed((current) => Math.min(current, bardicPerformanceMaximum)), [bardicPerformanceMaximum]);
  useEffect(() => setWildShapeUsed((current) => wildShapeMaximum === null ? 0 : Math.min(current, wildShapeMaximum)), [wildShapeMaximum]);

  const characterDraft: CharacterDraftV1 = { version: 1, name, classId, archetypeId, ancestryId, level, humanAbility, baseAbilities, pointBuyBudget, abilityBoosts, favoredClassHitPoints, favoredClassSkillRanks, selectedFeatIds, selectedTraitIds, selectedTraitChoices, selectedFeatChoices, skillRanks, selectedOptions, preparedSpells: selectedSpellIds, spellSlotUses: Object.fromEntries(Object.entries(spellSlotUses)), arcaneReservoir: reservoir ? reservoirPoints : null, bardicPerformanceUsed: classId === "bard" ? bardicPerformanceUsed : 0, wildShapeUsed: classId === "druid" ? wildShapeUsed : 0, currentHitPoints, temporaryHitPoints, activeEffects, inventory, coins };
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
    const draftAncestry = ancestries.find((item) => item.id === draft.ancestryId) ?? ancestries[0];
    const draftFixedModifiers = (draftAncestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {};
    const draftChoiceAmount = (draftAncestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
    const draftAbilities = Object.fromEntries(Object.keys(draft.baseAbilities).map((ability) => [ability, draft.baseAbilities[ability as keyof typeof defaultAbilities] + (draftFixedModifiers[ability as keyof typeof defaultAbilities] ?? 0) + (draftChoiceAmount && ability === draft.humanAbility ? draftChoiceAmount : 0) + draft.abilityBoosts.filter((boost) => boost === ability).length])) as typeof defaultAbilities;
    const draftCastingAbility = draftClass.spellcasting && abilityNames.includes(draftClass.spellcasting.ability as keyof typeof draftAbilities) ? draftClass.spellcasting.ability as keyof typeof draftAbilities : null;
    const draftAbilityScore = draftCastingAbility ? draftAbilities[draftCastingAbility] : 10;
    const draftIsSpontaneous = draftClass.spellcasting?.castingType === "spontaneous";
    const draftPreparedCasting = draftClass.spellcasting && !draftIsSpontaneous ? spellcastingProgression(draftClass, draft.level, { abilityScore: draftAbilityScore }) : null;
    const draftSpontaneousCasting = draftIsSpontaneous ? spontaneousSpellcastingProgression(draftClass, draft.level, { abilityScore: draftAbilityScore }) : null;
    const draftCasting = draftSpontaneousCasting ?? draftPreparedCasting;
    const draftBaseSpells = draftCasting ? spellsAvailableToClass(spells, draftClass.id, draftCasting.maximumSpellLevel) : [];
    const draftReservoir = draft.classId === "arcanist" ? arcaneReservoir(draft.level) : null;
    const draftBardicPerformanceMaximum = draft.classId === "bard" ? bardicPerformanceRounds(draft.level, Math.floor((draftAbilities.charisma - 10) / 2)) : 0;
    const draftWildShapeMaximum = draft.classId === "druid" ? druidWildShapeUses(draft.level) : 0;
    const draftOppositionSchoolIds = oppositionSchoolsFromOptions(draft.classId, draft.selectedOptions);
    const draftBloodline = bloodlineFromOptions(draft.classId, draft.selectedOptions);
    const draftBloodlineSpells = draftIsSpontaneous && draftCasting ? bloodlineBonusSpells(spells, draftBloodline, draft.level, draftClass.id).filter((spell) => spell.levelByClass[draftClass.id] <= draftCasting.maximumSpellLevel) : [];
    const draftSpells = mergeSpellLists(draftBaseSpells, draftBloodlineSpells);
    const draftBloodlineSpellIds = draftBloodlineSpells.map((spell) => spell.id);
    const normalizedDraftSpells = draftIsSpontaneous ? normalizeKnownSpells(draft.preparedSpells, draftSpells, draftClass.id, draftSpontaneousCasting?.known ?? [], draftBloodlineSpellIds) : normalizePreparedSpellsWithOpposition(draft.preparedSpells, draftSpells, draftClass.id, draftPreparedCasting?.prepared ?? [], draftOppositionSchoolIds);
    const draftTraitIds = normalizeSelectedTraits(draft.selectedTraitIds, traits);
    setName(draft.name); setClassId(draft.classId); setArchetypeId(draft.archetypeId); setAncestryId(draft.ancestryId); setLevel(draft.level); setHumanAbility(draft.humanAbility); setBaseAbilities(draft.baseAbilities); setPointBuyBudget(draft.pointBuyBudget); setAbilityBoosts(draft.abilityBoosts); setFavoredClassHitPoints(draft.favoredClassHitPoints); setFavoredClassSkillRanks(draft.favoredClassSkillRanks); setSelectedFeatIds(draft.selectedFeatIds); setSelectedTraitIds(draftTraitIds); setSelectedTraitChoices(normalizeSelectedTraitChoices(draft.selectedTraitChoices, draftTraitIds, traits, { spells, classes, classId: draft.classId })); setSelectedFeatChoices(normalizeSelectedFeatChoices(draft.selectedFeatChoices, draft.selectedFeatIds, feats)); setSkillRanks(draft.skillRanks); setSelectedOptions(draft.selectedOptions); setSelectedSpellIds(normalizedDraftSpells); setSpellSlotUses(normalizeSpellSlotUses(draft.spellSlotUses, draftCasting?.slots ?? [])); setReservoirPoints(draftReservoir ? Math.min(draft.arcaneReservoir ?? draftReservoir.dailyRefresh, draftReservoir.maximum) : 0); setBardicPerformanceUsed(Math.min(draft.bardicPerformanceUsed, draftBardicPerformanceMaximum)); setWildShapeUsed(draftWildShapeMaximum === null ? 0 : Math.min(draft.wildShapeUsed, draftWildShapeMaximum)); setCurrentHitPoints(draft.currentHitPoints); setTemporaryHitPoints(draft.temporaryHitPoints); setActiveEffects(draft.activeEffects); setInventory(draft.inventory); setCoins(draft.coins); setSaveNotice(successNotice);
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
  const resetCharacter = () => { localStorage.removeItem(legacyCharacterKey); setName(""); setClassId("arcanist"); setArchetypeId(""); setAncestryId("human"); setLevel(1); setHumanAbility("intelligence"); setBaseAbilities(defaultAbilities); setPointBuyBudget(15); setAbilityBoosts([]); setFavoredClassHitPoints(0); setFavoredClassSkillRanks(0); setSelectedFeatIds([]); setSelectedTraitIds([]); setSelectedTraitChoices({}); setSelectedFeatChoices({}); setSkillRanks({}); setSelectedOptions({}); setSelectedSpellIds([]); setSpellSlotUses({}); setReservoirPoints(3); setBardicPerformanceUsed(0); setWildShapeUsed(0); setCurrentHitPoints(null); setTemporaryHitPoints(0); setActiveEffects([]); setInventory([]); setCoins({ cp: 0, sp: 0, gp: 0, pp: 0 }); setSaveNotice("Character reset"); };
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
    <CharacterDetails name={name} classId={classId} archetypeId={archetypeId} ancestryId={ancestryId} level={level} classes={classes} archetypes={availableArchetypes} ancestries={ancestries} saveNotice={saveNotice} onNameChange={setName} onClassChange={(next) => { setClassId(next); setArchetypeId(""); }} onArchetypeChange={setArchetypeId} onAncestryChange={setAncestryId} onLevelChange={(next) => { setLevel(next); setShowLevelUp(false); }} onReviewLevelUp={() => setShowLevelUp(true)} onSave={saveCharacter} onLoad={loadCharacter} onImport={importCharacter} onExport={exportCharacter} onPrint={printCharacter} onReset={resetCharacter} />
    {showLevelUp && level < 20 && <LevelUpPanel currentLevel={level} className={characterClass.name} gains={levelUpGains} onCancel={() => setShowLevelUp(false)} onConfirm={() => { setLevel(level + 1); setShowLevelUp(false); setSaveNotice(`Advanced to level ${level + 1}. Review newly unlocked choices.`); }} />}
    <CharacterTabs activeTab={activeTab} onChange={setActiveTab} />
    <section id="character-tab-panel" className="tab-panel" role="tabpanel" aria-labelledby={`character-tab-${activeTab}`} tabIndex={0}>
      {activeTab === "overview" && <section className="sheet-grid"><AbilityEditor abilityNames={abilityNames} ancestryName={ancestry.name} choiceAbility={humanAbility} choiceAmount={choiceAmount} baseAbilities={baseAbilities} abilities={abilities} modifiers={combat.abilityModifiers} pointBuyBudget={pointBuyBudget} pointBuySpent={pointBuy.spent} abilityBoosts={abilityBoosts} onChoiceAbilityChange={setHumanAbility} onAbilityChange={updateAbility} onPointBuyBudgetChange={setPointBuyBudget} onAbilityBoostChange={updateAbilityBoost} /><ProgressionSummary combat={combat} progression={progression} /><FavoredClassBonus className={characterClass.name} level={level} hitPoints={favoredClassHitPoints} skillRanks={favoredClassSkillRanks} onChange={(hitPoints, skillRanks) => { setFavoredClassHitPoints(hitPoints); setFavoredClassSkillRanks(skillRanks); }} /></section>}
      {activeTab === "actions" && <div className="actions-workspace"><CombatPanel combat={combat} modifierSources={selectedFeatBonuses.sources} conditionalModifiers={selectedTraitBonuses.conditionalModifiers} /><ActivePlayPanel maximumHitPoints={combat.averageHitPoints} currentHitPoints={currentHitPoints ?? combat.averageHitPoints} temporaryHitPoints={temporaryHitPoints} effects={activeEffects} onCurrentHitPointsChange={setCurrentHitPoints} onTemporaryHitPointsChange={setTemporaryHitPoints} onEffectsChange={setActiveEffects} /></div>}
      {activeTab === "storage" && <div className="storage-workspace"><CharacterLibrary library={characterLibrary} classNames={Object.fromEntries(classes.map((item) => [item.id, item.name]))} ancestryNames={Object.fromEntries(ancestries.map((item) => [item.id, item.name]))} onOpen={openLibraryCharacter} onDelete={deleteLibraryCharacter} onNew={newCharacter} /><EquipmentPanel strength={abilities.strength} strengthModifier={combat.abilityModifiers.strength} dexterityModifier={combat.abilityModifiers.dexterity} baseAttackBonus={progression.baseAttackBonus} weaponBonuses={selectedFeatBonuses.weaponBonuses} inventory={inventory} coins={coins} onInventoryChange={setInventory} onCoinsChange={setCoins} /></div>}
      {activeTab === "spells" && (spontaneousCasting ? <SpontaneousSpellbook spells={availableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={characterClass.id} className={characterClass.name} castingAbilityName={castingAbility ? labels[castingAbility] : "casting ability"} slots={spontaneousCasting.slots} knownLimits={knownLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} knownSpellIds={selectedSpellIds} grantedSpellIds={bloodlineSpellIds} onKnownSpellIdsChange={updateSelectedSpells} slotUses={spellSlotUses} onSlotUsesChange={updateSpellSlotUses} onRefreshDay={refreshDay} /> : preparedCasting ? <Spellbook spells={availableSpells} spellTraitBonuses={selectedTraitBonuses.spellBonuses} classId={characterClass.id} className={characterClass.name} castingAbilityName={castingAbility ? labels[castingAbility] : "casting ability"} slots={preparedCasting.slots} preparedLimits={preparedLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} preparedSpellIds={selectedSpellIds} onPreparedSpellIdsChange={updateSelectedSpells} slotUses={spellSlotUses} onSlotUsesChange={updateSpellSlotUses} reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null} onReservoirChange={updateReservoir} onRefreshDay={refreshDay} oppositionSchoolIds={oppositionSchoolIds} /> : <p className="empty-tab">This class does not cast spells.</p>)}
      {activeTab === "skills" && <SkillAllocation skills={skillEntries} allocatedRanks={allocatedSkillRanks} totalRanks={progression.skillRanks} maximumRanksPerSkill={level} onRankChange={updateSkill} />}
      {activeTab === "feats" && <FeatChoices feats={feats} choices={featChoices} selectedFeatIds={selectedFeatIds} selectedFeatChoices={selectedFeatChoices} onFeatChange={updateFeat} onFeatChoiceChange={updateFeatChoice} />}
      {activeTab === "features" && <div className="feature-workspace"><ClassFeatures level={level} className={characterClass.name} features={progression.features} dailyResource={classId === "bard" ? { label: "Performance rounds", unit: "round", maximum: bardicPerformanceMaximum, used: bardicPerformanceUsed, onUsedChange: setBardicPerformanceUsed } : classId === "druid" && level >= 4 ? { label: "Wild Shape", unit: "use", maximum: wildShapeMaximum, used: wildShapeUsed, onUsedChange: setWildShapeUsed } : undefined} />{classOptionChoices.length > 0 && <ClassOptions choices={classOptionChoices} selectedOptions={selectedOptions} classLevel={level} charismaModifier={combat.abilityModifiers.charisma} onOptionChange={updateClassOption} />}</div>}
      {activeTab === "options" && <TraitChoices traits={traits} spells={spells} classes={classes} classId={characterClass.id} selectedTraitIds={selectedTraitIds} selectedTraitChoices={selectedTraitChoices} onChange={updateTrait} onChoiceChange={updateTraitChoice} />}
    </section>
  </main>;
}
