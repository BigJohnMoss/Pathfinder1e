export function baseAttackBonus(progression, level) {
  assertLevel(level);
  if (progression === "full") return level;
  if (progression === "three-quarters") return Math.floor(level * 0.75);
  if (progression === "half") return Math.floor(level * 0.5);
  throw new Error(`Unknown BAB progression: ${progression}`);
}

export function savingThrow(progression, level) {
  assertLevel(level);
  if (progression === "good") return 2 + Math.floor(level / 2);
  if (progression === "poor") return Math.floor(level / 3);
  throw new Error(`Unknown save progression: ${progression}`);
}

function assertClassLevel(characterClass, level) {
  assertLevel(level);
  const maximumLevel = characterClass.maximumLevel ?? 20;
  if (level > maximumLevel) throw new RangeError(`${characterClass.name ?? "Class"} has a maximum level of ${maximumLevel}.`);
}

export function classBaseAttackBonus(characterClass, level) {
  assertClassLevel(characterClass, level);
  return characterClass.baseAttackBonusByLevel?.[level - 1] ?? baseAttackBonus(characterClass.babProgression, level);
}

export function classSavingThrow(characterClass, save, level) {
  assertClassLevel(characterClass, level);
  return characterClass.savesByLevel?.[level - 1]?.[save] ?? savingThrow(characterClass.saves[save], level);
}

const divineSpellcastingClassIds = new Set(["cleric", "druid", "oracle", "paladin", "ranger"]);

export function spellcastingTradition(characterClass) {
  if (!characterClass?.spellcasting) return null;
  return characterClass.spellcasting.tradition ?? (divineSpellcastingClassIds.has(characterClass.id) ? "divine" : "arcane");
}

export function effectiveSpellcastingLevels(classes, classLevels, prestigeTargets = {}) {
  const classesById = new Map(classes.map(characterClass => [characterClass.id, characterClass]));
  const levels = Object.fromEntries(classLevels.flatMap(entry => classesById.get(entry.classId)?.spellcasting ? [[entry.classId, entry.level]] : []));
  for (const entry of classLevels) {
    const prestigeClass = classesById.get(entry.classId);
    const advancement = prestigeClass?.spellcastingAdvancement;
    if (!advancement) continue;
    const amount = advancement.levels.filter(level => level <= entry.level).length;
    if (amount === 0) continue;
    const eligible = classLevels.map(candidate => candidate.classId).filter(classId => {
      if (classId === entry.classId) return false;
      const tradition = spellcastingTradition(classesById.get(classId));
      return tradition && (advancement.tradition === "any" || advancement.tradition === tradition);
    });
    const targetCount = advancement.targetCount ?? 1;
    const requested = Array.isArray(prestigeTargets[entry.classId]) ? prestigeTargets[entry.classId] : [];
    const targets = advancement.targetTraditions
      ? advancement.targetTraditions.flatMap((requiredTradition, targetIndex) => {
          const candidates = eligible.filter(classId => spellcastingTradition(classesById.get(classId)) === requiredTradition);
          const requestedClassId = requested[targetIndex];
          if (requestedClassId && candidates.includes(requestedClassId)) return [requestedClassId];
          return candidates.length === 1 ? [candidates[0]] : [];
        }).filter((classId, index, selected) => selected.indexOf(classId) === index)
      : [...new Set(requested.filter(classId => eligible.includes(classId)))].slice(0, targetCount);
    if (!advancement.targetTraditions && targets.length === 0 && eligible.length === targetCount) targets.push(...eligible);
    for (const classId of targets) levels[classId] = Math.min(20, (levels[classId] ?? 0) + amount);
  }
  return levels;
}

export function abilityModifier(score) {
  if (!Number.isInteger(score) || score < 1) throw new RangeError("Ability score must be a positive integer.");
  return Math.floor((score - 10) / 2);
}

export const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const pointBuyCosts = { 7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17 };

export function abilityScorePointCost(score) {
  if (!Number.isInteger(score) || pointBuyCosts[score] === undefined) throw new RangeError("Point-buy ability score must be an integer from 7 to 18.");
  return pointBuyCosts[score];
}

export function pointBuySummary(abilities, budget = 15) {
  if (![10, 15, 20, 25].includes(budget)) throw new RangeError("Point-buy budget must be 10, 15, 20, or 25.");
  const spent = abilityNames.reduce((total, ability) => total + abilityScorePointCost(abilities[ability]), 0);
  return { budget, spent, remaining: budget - spent, valid: spent <= budget };
}

export function abilityBoostCount(level) {
  assertLevel(level);
  return Math.floor(level / 4);
}

export function normalizeAbilityBoosts(boosts, level) {
  const count = abilityBoostCount(level);
  return Array.isArray(boosts) ? boosts.filter(ability => abilityNames.includes(ability)).slice(0, count) : [];
}

export function abilityModifiers(abilities) {
  return Object.fromEntries(abilityNames.map(name => [name, abilityModifier(abilities[name])]));
}

export function characterCombatStats(characterClass, level, abilities) {
  assertClassLevel(characterClass, level);
  const modifiers = abilityModifiers(abilities);
  const bab = classBaseAttackBonus(characterClass, level);
  const baseSaves = Object.fromEntries(Object.keys(characterClass.saves).map(save => [save, classSavingThrow(characterClass, save, level)]));
  return {
    abilityModifiers: modifiers,
    baseAttackBonus: bab,
    saves: {
      fortitude: baseSaves.fortitude + modifiers.constitution,
      reflex: baseSaves.reflex + modifiers.dexterity,
      will: baseSaves.will + modifiers.wisdom
    },
    initiative: modifiers.dexterity,
    armorClass: {
      normal: 10 + modifiers.dexterity,
      touch: 10 + modifiers.dexterity,
      flatFooted: 10
    },
    combatManeuverBonus: bab + modifiers.strength,
    combatManeuverDefense: 10 + bab + modifiers.strength + modifiers.dexterity,
    averageHitPoints: averageHitPoints(characterClass.hitDie, level, modifiers.constitution)
  };
}

export function averageHitPoints(hitDie, level, constitutionModifier = 0) {
  assertLevel(level);
  if (!Number.isInteger(hitDie) || ![6, 8, 10, 12].includes(hitDie)) throw new RangeError("Hit Die must be d6, d8, d10, or d12.");
  if (!Number.isInteger(constitutionModifier)) throw new RangeError("Constitution modifier must be an integer.");
  const laterLevelGain = Math.max(1, Math.floor(hitDie / 2) + 1 + constitutionModifier);
  return Math.max(1, hitDie + constitutionModifier) + (level - 1) * laterLevelGain;
}

export function multiclassAverageHitPoints(classes, classLevels, constitutionModifier = 0) {
  if (!Array.isArray(classes) || !Array.isArray(classLevels) || classLevels.length === 0 || !Number.isInteger(constitutionModifier)) {
    throw new RangeError("Valid class levels and a Constitution modifier are required.");
  }
  const classesById = new Map(classes.map(characterClass => [characterClass.id, characterClass]));
  let firstCharacterLevel = true;
  return classLevels.reduce((total, entry) => {
    const characterClass = classesById.get(entry?.classId);
    if (!characterClass || !Number.isInteger(entry.level) || entry.level < 1) throw new RangeError("Each class level entry must be valid.");
    const laterLevelGain = Math.max(1, Math.floor(characterClass.hitDie / 2) + 1 + constitutionModifier);
    const classHitPoints = firstCharacterLevel
      ? Math.max(1, characterClass.hitDie + constitutionModifier) + (entry.level - 1) * laterLevelGain
      : entry.level * laterLevelGain;
    firstCharacterLevel = false;
    return total + classHitPoints;
  }, 0);
}

const lightLoads = [3,6,10,13,16,20,23,26,30,33,38,43,50,58,66,76,86,100,116,133,153,173,200,233,266,306,346,400,466];

export function carryingCapacity(strength) {
  if (!Number.isInteger(strength) || strength < 1) throw new RangeError("Strength must be a positive integer.");
  const multiplier = Math.pow(4, Math.floor(Math.max(0, strength - 20) / 10));
  const tableStrength = strength <= 29 ? strength : 20 + ((strength - 20) % 10);
  const light = lightLoads[tableStrength - 1] * multiplier;
  return { light, medium: light * 2, heavy: light * 3 };
}

export function encumbrance(strength, items) {
  const capacity = carryingCapacity(strength);
  const carriedWeight = items.reduce((total, item) => total + item.weight * item.quantity, 0);
  const load = carriedWeight <= capacity.light ? "light" : carriedWeight <= capacity.medium ? "medium" : carriedWeight <= capacity.heavy ? "heavy" : "overloaded";
  return { carriedWeight, capacity, load };
}

export function spellsAvailableToClass(spells, classId, maximumSpellLevel, spellListAdditions = {}) {
  if (!Number.isInteger(maximumSpellLevel) || maximumSpellLevel < 0 || maximumSpellLevel > 9) throw new RangeError("Maximum spell level must be an integer from 0 to 9.");
  return spells.map(spell => spellListAdditions[spell.id] === undefined ? spell : { ...spell, levelByClass: { ...spell.levelByClass, [classId]: spellListAdditions[spell.id] } })
    .filter(spell => spell.levelByClass[classId] !== undefined && spell.levelByClass[classId] <= maximumSpellLevel)
    .sort((a, b) => a.levelByClass[classId] - b.levelByClass[classId] || a.name.localeCompare(b.name));
}

export function normalizePreparedSpells(preparedSpellIds, spells, classId, preparedLimits) {
  const limits = new Map(preparedLimits.map(entry => [entry.level, entry.count]));
  const available = new Map(spells.filter(spell => spell.levelByClass[classId] !== undefined).map(spell => [spell.id, spell]));
  const preparedByLevel = new Map();
  return preparedSpellIds.filter(id => {
    const spell = available.get(id);
    if (!spell) return false;
    const level = spell.levelByClass[classId];
    const count = preparedByLevel.get(level) ?? 0;
    if (count >= (limits.get(level) ?? 0)) return false;
    preparedByLevel.set(level, count + 1);
    return true;
  });
}

export function normalizeSpellSlotUses(slotUses, slots) {
  const counts = new Map(slots.map(slot => [slot.level, slot.count]));
  if (!slotUses || typeof slotUses !== "object" || Array.isArray(slotUses)) return {};
  return Object.fromEntries(Object.entries(slotUses).flatMap(([rawLevel, used]) => {
    const level = Number(rawLevel);
    const count = counts.get(level);
    return Number.isInteger(level) && Number.isInteger(used) && used > 0 && count ? [[level, Math.min(used, count)]] : [];
  }));
}

export function arcaneReservoir(level) {
  assertLevel(level);
  return { maximum: 3 + level, dailyRefresh: 3 + Math.floor(level / 2) };
}

export { bardicPerformanceRounds } from "./bardic-performance.js";
export { druidWildShapeUses } from "./druid-wild-shape.js";

export function bonusSpellsPerDay(abilityScore, maximumSpellLevel) {
  if (!Number.isInteger(maximumSpellLevel) || maximumSpellLevel < 0 || maximumSpellLevel > 9) throw new RangeError("Maximum spell level must be an integer from 0 to 9.");
  const modifier = abilityModifier(abilityScore);
  return Array.from({ length: maximumSpellLevel }, (_, index) => {
    const level = index + 1;
    return { level, count: modifier < level ? 0 : Math.floor((modifier - level) / 4) + 1 };
  }).filter(entry => entry.count > 0);
}

export function spellSaveDC(abilityScore, spellLevel) {
  if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9) throw new RangeError("Spell level must be an integer from 0 to 9.");
  return 10 + spellLevel + abilityModifier(abilityScore);
}

export function spellcastingProgression(characterClass, level, { abilityScore = 10 } = {}) {
  assertLevel(level);
  const spellcasting = characterClass.spellcasting;
  if (!spellcasting) return null;
  const slots = spellcasting.slotsByLevel?.[level - 1];
  const prepared = spellcasting.preparedByLevel?.[level - 1];
  if (!Array.isArray(slots) || !Array.isArray(prepared)) throw new Error("Spellcasting progression is incomplete.");
  const unlocks = spellcasting.spellLevelUnlocks;
  const bonusByLevel = Object.fromEntries(bonusSpellsPerDay(abilityScore, slots.length).map(entry => [entry.level, entry.count]));
  const baseSlots = slots.map((base, index) => {
    const spellLevel = index + 1;
    const unlocked = !Array.isArray(unlocks) || level >= (unlocks[index] ?? Number.POSITIVE_INFINITY);
    const bonus = unlocked ? bonusByLevel[spellLevel] ?? 0 : 0;
    return { level: spellLevel, base: unlocked ? base : 0, bonus, count: (unlocked ? base : 0) + bonus };
  });
  const preparedSlots = spellcasting.preparesFromSlots
    ? [{ level: 0, count: prepared[0] ?? 0 }, ...baseSlots.map(({ level: spellLevel, count }) => ({ level: spellLevel, count }))]
    : prepared.map((count, spellLevel) => ({ level: spellLevel, count }));
  const accessibleSpellLevels = Array.isArray(unlocks)
    ? baseSlots.filter(entry => entry.count > 0)
    : baseSlots.filter(entry => entry.base > 0);
  return {
    ability: spellcasting.ability,
    castingType: spellcasting.castingType,
    maximumSpellLevel: Math.min(Math.max(0, abilityScore - 10), Math.max(0, ...accessibleSpellLevels.map(entry => entry.level))),
    slots: baseSlots.filter(entry => entry.count > 0),
    prepared: preparedSlots.filter(entry => entry.count > 0)
  };
}

export function normalizeCharacterDraft(value, { classIds = null, ancestryIds = null, archetypeIds = null, archetypeIdsByClass = null } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value;
  if (draft.version !== undefined && draft.version !== 1) return null;
  const validAbilities = abilityNames.every(name => Number.isInteger(draft.baseAbilities?.[name]) && draft.baseAbilities[name] >= 7 && draft.baseAbilities[name] <= 18);
  if (typeof draft.classId !== "string" || (classIds && !classIds.includes(draft.classId)) || !Number.isInteger(draft.level) || draft.level < 1 || draft.level > 20 || !validAbilities) return null;
  const normalizedClassLevels = (() => {
    if (!Array.isArray(draft.classLevels) || draft.classLevels.length === 0) return [{ classId: draft.classId, level: draft.level }];
    const seen = new Set();
    const entries = draft.classLevels.flatMap(entry => {
      if (!entry || typeof entry.classId !== "string" || seen.has(entry.classId) ||
        (classIds && !classIds.includes(entry.classId)) || !Number.isInteger(entry.level) || entry.level < 1 || entry.level > 20) return [];
      seen.add(entry.classId);
      return [{ classId: entry.classId, level: entry.level }];
    });
    const totalLevel = entries.reduce((total, entry) => total + entry.level, 0);
    return entries.length === draft.classLevels.length && entries[0]?.classId === draft.classId && totalLevel === draft.level
      ? entries
      : [{ classId: draft.classId, level: draft.level }];
  })();
  const preparedSpells = Array.isArray(draft.preparedSpells) ? draft.preparedSpells.filter(id => typeof id === "string") : [];
  const spellSlotUses = isRankRecord(draft.spellSlotUses);
  const validClassIds = new Set(normalizedClassLevels.map(entry => entry.classId));
  const normalizedArchetypeIdsByClass = Object.fromEntries(Object.entries(isStringRecord(draft.archetypeIdsByClass)).filter(([selectedClassId, selectedArchetypeId]) =>
    validClassIds.has(selectedClassId) && (!archetypeIdsByClass || archetypeIdsByClass[selectedClassId]?.includes(selectedArchetypeId))
  ));
  const legacyArchetypeId = typeof draft.archetypeId === "string" && (!archetypeIds || archetypeIds.includes(draft.archetypeId)) ? draft.archetypeId : "";
  if (!normalizedArchetypeIdsByClass[draft.classId] && legacyArchetypeId) normalizedArchetypeIdsByClass[draft.classId] = legacyArchetypeId;
  const preparedSpellsByClass = isStringArrayRecord(draft.preparedSpellsByClass, validClassIds);
  const spellSlotUsesByClass = isNestedRankRecord(draft.spellSlotUsesByClass, validClassIds);
  const prestigeSpellcastingTargets = Object.fromEntries(Object.entries(isStringArrayRecord(draft.prestigeSpellcastingTargets, validClassIds)).map(([prestigeClassId, targetIds]) => [prestigeClassId, [...new Set(targetIds.filter(classId => validClassIds.has(classId) && classId !== prestigeClassId))].slice(0, 2)]));
  if (!preparedSpellsByClass[draft.classId]) preparedSpellsByClass[draft.classId] = preparedSpells;
  if (!spellSlotUsesByClass[draft.classId]) spellSlotUsesByClass[draft.classId] = spellSlotUses;
  return {
    version: 1,
    name: typeof draft.name === "string" ? draft.name.slice(0, 120) : "",
    classId: draft.classId,
    classLevels: normalizedClassLevels,
    archetypeId: normalizedArchetypeIdsByClass[draft.classId] ?? legacyArchetypeId,
    archetypeIdsByClass: normalizedArchetypeIdsByClass,
    prestigeSpellcastingTargets,
    ancestryId: typeof draft.ancestryId === "string" && (!ancestryIds || ancestryIds.includes(draft.ancestryId)) ? draft.ancestryId : "human",
    selectedAlternateRacialTraitIds: Array.isArray(draft.selectedAlternateRacialTraitIds) ? draft.selectedAlternateRacialTraitIds.filter(id => typeof id === "string") : [],
    level: draft.level,
    humanAbility: abilityNames.includes(draft.humanAbility) ? draft.humanAbility : "intelligence",
    baseAbilities: draft.baseAbilities,
    pointBuyBudget: [10, 15, 20, 25].includes(draft.pointBuyBudget) ? draft.pointBuyBudget : 15,
    abilityBoosts: normalizeAbilityBoosts(draft.abilityBoosts, draft.level),
    favoredClassHitPoints: Number.isInteger(draft.favoredClassHitPoints) && draft.favoredClassHitPoints > 0 ? Math.min(draft.level, draft.favoredClassHitPoints) : 0,
    favoredClassSkillRanks: Number.isInteger(draft.favoredClassSkillRanks) && draft.favoredClassSkillRanks > 0 ? Math.min(Math.max(0, draft.level - (Number.isInteger(draft.favoredClassHitPoints) && draft.favoredClassHitPoints > 0 ? Math.min(draft.level, draft.favoredClassHitPoints) : 0)), draft.favoredClassSkillRanks) : 0,
    selectedFeatIds: Array.isArray(draft.selectedFeatIds) ? draft.selectedFeatIds.filter(id => typeof id === "string") : [],
    selectedTraitIds: Array.isArray(draft.selectedTraitIds) ? draft.selectedTraitIds.filter(id => typeof id === "string") : [],
    selectedTraitChoices: isStringRecord(draft.selectedTraitChoices),
    selectedFeatChoices: isStringRecord(draft.selectedFeatChoices),
    skillRanks: isRankRecord(draft.skillRanks),
    selectedOptions: isStringRecord(draft.selectedOptions),
    preparedSpells,
    preparedSpellsByClass,
    spellSlotUses,
    spellSlotUsesByClass,
    arcaneReservoir: Number.isInteger(draft.arcaneReservoir) && draft.arcaneReservoir >= 0 ? draft.arcaneReservoir : null,
    bardicPerformanceUsed: Number.isInteger(draft.bardicPerformanceUsed) && draft.bardicPerformanceUsed >= 0 ? draft.bardicPerformanceUsed : 0,
    wildShapeUsed: Number.isInteger(draft.wildShapeUsed) && draft.wildShapeUsed >= 0 ? draft.wildShapeUsed : 0,
    currentHitPoints: Number.isInteger(draft.currentHitPoints) && draft.currentHitPoints >= 0 ? Math.min(9999, draft.currentHitPoints) : null,
    temporaryHitPoints: Number.isInteger(draft.temporaryHitPoints) && draft.temporaryHitPoints >= 0 ? Math.min(9999, draft.temporaryHitPoints) : 0,
    activeEffects: Array.isArray(draft.activeEffects) ? draft.activeEffects.filter(effect =>
      effect && typeof effect.id === "string" && typeof effect.name === "string" && effect.name.trim() &&
      ["initiative", "armorClass", "fortitude", "reflex", "will"].includes(effect.target) &&
      Number.isInteger(effect.bonus) && effect.bonus >= -20 && effect.bonus <= 20 &&
      Number.isInteger(effect.roundsRemaining) && effect.roundsRemaining > 0
    ).slice(0, 20).map(effect => ({ id: effect.id.slice(0, 80), name: effect.name.trim().slice(0, 80), target: effect.target, bonus: effect.bonus, roundsRemaining: Math.min(999, effect.roundsRemaining) })) : [],
    inventory: Array.isArray(draft.inventory) ? draft.inventory.filter(entry => entry && typeof entry.itemId === "string" && Number.isInteger(entry.quantity) && entry.quantity > 0).map(entry => ({ itemId: entry.itemId, quantity: Math.min(999, entry.quantity), equipped: entry.equipped === true, ...(Number.isInteger(entry.enhancementBonus) && entry.enhancementBonus > 0 ? { enhancementBonus: Math.min(5, entry.enhancementBonus) } : {}) })) : [],
    coins: Object.fromEntries(["cp", "sp", "gp", "pp"].map(coin => [coin, Number.isInteger(draft.coins?.[coin]) && draft.coins[coin] >= 0 ? draft.coins[coin] : 0]))
  };
}

export function applyArchetype(characterClass, archetype) {
  if (!archetype || archetype.classId !== characterClass.id) return characterClass;
  const featureIds = new Set(archetype.replacements.flatMap(replacement => replacement.featureIds ?? []));
  const progressionKeys = new Set(archetype.replacements.flatMap(replacement => replacement.progressionKeys ?? []));
  const overrides = new Map((archetype.featureOverrides ?? []).map(override => [override.featureId, override]));
  const retained = characterClass.features
    .filter(feature => !featureIds.has(feature.id) && !progressionKeys.has(feature.progressionKey))
    .map(feature => {
      const overridden = overrides.has(feature.id) ? { ...feature, summary: overrides.get(feature.id).summary } : feature;
      return feature.progressionKey === "druid-wild-shape" && archetype.wildShapeLevelAdjustment
        ? { ...overridden, level: feature.level - archetype.wildShapeLevelAdjustment }
        : overridden;
    })
    .filter(feature => feature.level <= 20);
  const replacements = archetype.replacements.flatMap(replacement => replacement.features);
  return {
    ...characterClass,
    name: `${characterClass.name} (${archetype.name})`,
    spellListAdditions: { ...(characterClass.spellListAdditions ?? {}), ...(archetype.spellListAdditions ?? {}) },
    spellcasting: archetype.removesSpellcasting ? undefined : characterClass.spellcasting,
    wildShapeLevelAdjustment: archetype.wildShapeLevelAdjustment ?? characterClass.wildShapeLevelAdjustment,
    druidDomainIds: archetype.druidDomainIds ?? characterClass.druidDomainIds,
    rangerCombatStyleIds: archetype.rangerCombatStyleIds ?? characterClass.rangerCombatStyleIds,
    mountedCompanionOnly: archetype.mountedCompanionOnly ?? characterClass.mountedCompanionOnly,
    classSkills: [...new Set(characterClass.classSkills.filter(skill => !(archetype.classSkillRemovals ?? []).includes(skill)).concat(archetype.classSkillAdditions ?? []))],
    features: [...retained, ...replacements].sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))
  };
}

export function normalizeSelectedTraits(selectedTraitIds, traits, slotCount = 2) {
  if (!Array.isArray(selectedTraitIds) || !Number.isInteger(slotCount) || slotCount < 0) return [];
  const byId = new Map(traits.map(trait => [trait.id, trait]));
  const categories = new Set();
  const selected = [];
  for (const id of selectedTraitIds) {
    const trait = typeof id === "string" ? byId.get(id) : null;
    if (!trait || selected.includes(id) || categories.has(trait.category) || selected.length >= slotCount) continue;
    selected.push(id);
    categories.add(trait.category);
  }
  return selected;
}

export function normalizeSelectedAlternateRacialTraits(selectedIds, alternateTraits = []) {
  const byId = new Map(alternateTraits.map((trait) => [trait.id, trait]));
  const replaced = new Set();
  const normalized = [];
  for (const id of Array.isArray(selectedIds) ? selectedIds : []) {
    const trait = byId.get(id);
    if (!trait || normalized.includes(id) || !Array.isArray(trait.replaces) || trait.replaces.some((replacedId) => replaced.has(replacedId))) continue;
    normalized.push(id);
    trait.replaces.forEach((replacedId) => replaced.add(replacedId));
  }
  return normalized;
}

export function normalizeSelectedTraitChoices(selectedTraitChoices, selectedTraitIds, traits, { spells = [], classes = [], classId } = {}) {
  if (!selectedTraitChoices || typeof selectedTraitChoices !== "object" || Array.isArray(selectedTraitChoices)) return {};
  const selected = new Set(normalizeSelectedTraits(selectedTraitIds, traits));
  const byId = new Map(traits.map(trait => [trait.id, trait]));
  return Object.fromEntries(Object.entries(selectedTraitChoices).filter(([traitId, choice]) => {
    const traitChoice = byId.get(traitId)?.choice;
    const validChoice = traitChoice?.key === "classSkill"
      ? traitChoice.options.includes(choice)
      : traitChoice?.key === "spell" && spells.some(spell =>
        spell.id === choice && (!classId || spell.levelByClass?.[classId] !== undefined)
        && (traitChoice.maximumSpellLevel === undefined || Math.min(...Object.values(spell.levelByClass ?? {})) <= traitChoice.maximumSpellLevel)
      ) || traitChoice?.key === "class" && classes.some(characterClass => characterClass.id === choice);
    return selected.has(traitId) && typeof choice === "string" && validChoice;
  }));
}

export function traitBonuses(selectedTraitIds, traits, selectedTraitChoices = {}, sources = {}) {
  const selected = normalizeSelectedTraits(selectedTraitIds, traits);
  const choices = normalizeSelectedTraitChoices(selectedTraitChoices, selected, traits, sources);
  const result = { initiative: 0, saves: { fortitude: 0, reflex: 0, will: 0 }, skillBonuses: {}, classSkills: [] };
  for (const id of selected) {
    const trait = traits.find(trait => trait.id === id);
    const effects = trait?.effects ?? {};
    result.initiative += effects.initiative ?? 0;
    for (const save of Object.keys(result.saves)) result.saves[save] += effects.saves?.[save] ?? 0;
    for (const [skill, bonus] of Object.entries(effects.skillBonuses ?? {})) result.skillBonuses[skill] = (result.skillBonuses[skill] ?? 0) + bonus;
    for (const skill of effects.classSkills ?? []) if (!result.classSkills.includes(skill)) result.classSkills.push(skill);
    for (const modifier of effects.conditionalModifiers ?? []) {
      result.conditionalModifiers ??= [];
      result.conditionalModifiers.push({ ...modifier, source: trait.name });
    }
    const choice = choices[id];
    if (choice && trait?.choice?.key === "classSkill" && !result.classSkills.includes(choice)) result.classSkills.push(choice);
    if (choice && trait?.choice?.key === "spell" && effects.chosenSpell) {
      result.spellBonuses ??= {};
      const current = result.spellBonuses[choice] ?? { casterLevel: 0, metamagicLevelAdjustment: 0 };
      result.spellBonuses[choice] = {
        casterLevel: current.casterLevel + (effects.chosenSpell.casterLevel ?? 0),
        metamagicLevelAdjustment: current.metamagicLevelAdjustment + (effects.chosenSpell.metamagicLevelAdjustment ?? 0)
      };
      if (effects.chosenSpell.spellLikeAbilityUses) {
        result.conditionalModifiers ??= [];
        result.conditionalModifiers.push({ label: `${effects.chosenSpell.spellLikeAbilityUses}/day spell-like ability`, condition: `cast ${sources.spells?.find(spell => spell.id === choice)?.name ?? choice} as a spell-like ability`, source: trait.name });
      }
    }
  }
  return result;
}

export function featBonuses(selectedFeatIds, feats, selectedFeatChoices = {}, { level = 1, skillRanks = {} } = {}) {
  const selected = new Set(Array.isArray(selectedFeatIds) ? selectedFeatIds : []);
  const result = {
    initiative: 0,
    saves: { fortitude: 0, reflex: 0, will: 0 },
    armorClass: { normal: 0, touch: 0, flatFooted: 0 },
    hitPoints: 0,
    skillBonuses: {},
    weaponBonuses: {},
    sources: []
  };
  const addSource = (source, target, bonus, choice) => {
    if (bonus) result.sources.push({ source, target, bonus, ...(choice ? { choice } : {}) });
  };
  for (const feat of feats) {
    if (!selected.has(feat.id)) continue;
    const effects = feat.effects ?? {};
    result.initiative += effects.initiative ?? 0;
    addSource(feat.name, "Initiative", effects.initiative ?? 0);
    for (const save of Object.keys(result.saves)) {
      const bonus = effects.saves?.[save] ?? 0;
      result.saves[save] += bonus;
      addSource(feat.name, `${save[0].toUpperCase()}${save.slice(1)} save`, bonus);
    }
    for (const armorClass of Object.keys(result.armorClass)) {
      const bonus = effects.armorClass?.[armorClass] ?? 0;
      result.armorClass[armorClass] += bonus;
      addSource(feat.name, armorClass === "normal" ? "AC" : armorClass === "touch" ? "Touch AC" : "Flat-footed AC", bonus);
    }
    if (effects.hitPoints) {
      const bonus = Math.max(effects.hitPoints.minimum, level * effects.hitPoints.perLevel);
      result.hitPoints += bonus;
      addSource(feat.name, "Hit points", bonus);
    }
    for (const [skill, bonus] of Object.entries(effects.skillBonuses ?? {})) {
      result.skillBonuses[skill] = (result.skillBonuses[skill] ?? 0) + bonus;
      addSource(feat.name, `${skill} checks`, bonus);
    }
    const choice = selectedFeatChoices[feat.id];
    if (choice && effects.chosenSkill) {
      const ranks = skillRanks[choice] ?? 0;
      const bonus = effects.chosenSkill.rankThreshold && ranks >= effects.chosenSkill.rankThreshold.minimum
        ? effects.chosenSkill.rankThreshold.bonus
        : effects.chosenSkill.bonus;
      result.skillBonuses[choice] = (result.skillBonuses[choice] ?? 0) + bonus;
      addSource(feat.name, `${choice} checks`, bonus, choice);
    }
    if (choice && effects.chosenWeapon) {
      const key = choice.trim().toLowerCase();
      const current = result.weaponBonuses[key] ?? { attack: 0, damage: 0 };
      const attack = effects.chosenWeapon.attack ?? 0;
      const damage = effects.chosenWeapon.damage ?? 0;
      result.weaponBonuses[key] = { attack: current.attack + attack, damage: current.damage + damage };
      addSource(feat.name, "Weapon attacks", attack, choice);
      addSource(feat.name, "Weapon damage", damage, choice);
    }
  }
  return result;
}

export function featSlotsAtLevel(level, { bonusFeats = 0 } = {}) {
  assertLevel(level);
  if (!Number.isInteger(bonusFeats) || bonusFeats < 0) throw new RangeError("Bonus feats must be a non-negative integer.");
  return 1 + Math.floor((level - 1) / 2) + bonusFeats;
}

export function skillRanksThroughLevel(characterClass, level, intelligenceScore, { racialBonusPerLevel = 0 } = {}) {
  assertLevel(level);
  if (!Number.isInteger(racialBonusPerLevel) || racialBonusPerLevel < 0) throw new RangeError("Racial skill bonus must be a non-negative integer.");
  const ranksPerLevel = Math.max(1, characterClass.skillRanksPerLevel + abilityModifier(intelligenceScore)) + racialBonusPerLevel;
  return ranksPerLevel * level;
}

export function skillTotal(characterClass, skill, abilityScore, ranks) {
  if (!Number.isInteger(ranks) || ranks < 0) throw new RangeError("Skill ranks must be a non-negative integer.");
  const group = skill.name.split(" (")[0];
  const isClassSkill = characterClass.classSkills.includes(skill.name) || characterClass.classSkills.includes(group);
  return {
    total: ranks + abilityModifier(abilityScore) + (isClassSkill && ranks > 0 ? 3 : 0),
    isClassSkill
  };
}

export function skillRankBudget(totalRanks, allocations) {
  if (!Number.isInteger(totalRanks) || totalRanks < 0) throw new RangeError("Total skill ranks must be a non-negative integer.");
  const allocated = Object.values(allocations).reduce((total, ranks) => total + (Number.isInteger(ranks) && ranks > 0 ? ranks : 0), 0);
  return { allocated, remaining: Math.max(0, totalRanks - allocated), overspent: Math.max(0, allocated - totalRanks) };
}

export function normalizeSkillRanks(allocations, totalRanks, maximumRanksPerSkill) {
  if (!Number.isInteger(totalRanks) || totalRanks < 0) throw new RangeError("Total skill ranks must be a non-negative integer.");
  if (!Number.isInteger(maximumRanksPerSkill) || maximumRanksPerSkill < 0) throw new RangeError("Maximum ranks per skill must be a non-negative integer.");
  if (!allocations || typeof allocations !== "object" || Array.isArray(allocations)) return {};
  let remaining = totalRanks;
  return Object.fromEntries(Object.entries(allocations).flatMap(([name, ranks]) => {
    if (typeof name !== "string" || !Number.isInteger(ranks) || ranks <= 0 || remaining <= 0) return [];
    const normalized = Math.min(ranks, maximumRanksPerSkill, remaining);
    remaining -= normalized;
    return normalized > 0 ? [[name, normalized]] : [];
  }));
}

export function classProgression(characterClass, level, { intelligenceScore = 10, racialSkillBonusPerLevel = 0, bonusFeats = 0 } = {}) {
  assertClassLevel(characterClass, level);
  return {
    level,
    baseAttackBonus: classBaseAttackBonus(characterClass, level),
    saves: Object.fromEntries(Object.keys(characterClass.saves).map(save => [save, classSavingThrow(characterClass, save, level)])),
    skillRanks: skillRanksThroughLevel(characterClass, level, intelligenceScore, { racialBonusPerLevel: racialSkillBonusPerLevel }),
    featSlots: featSlotsAtLevel(level, { bonusFeats }),
    features: featuresThroughLevel(characterClass, level)
  };
}

export function multiclassProgression(classes, classLevels, { intelligenceScore = 10, racialSkillBonusPerLevel = 0, bonusFeats = 0 } = {}) {
  if (!Array.isArray(classes) || !Array.isArray(classLevels) || classLevels.length === 0) {
    throw new RangeError("At least one class level is required.");
  }
  if (!Number.isInteger(racialSkillBonusPerLevel) || racialSkillBonusPerLevel < 0) {
    throw new RangeError("Racial skill bonus must be a non-negative integer.");
  }
  const classesById = new Map(classes.map(characterClass => [characterClass.id, characterClass]));
  const seenClassIds = new Set();
  const resolved = classLevels.map(entry => {
    if (!entry || typeof entry.classId !== "string" || !Number.isInteger(entry.level) || entry.level < 1 || entry.level > 20) {
      throw new RangeError("Each multiclass entry must have a valid class id and 1-20 levels.");
    }
    if (seenClassIds.has(entry.classId)) throw new RangeError("Each class may appear only once.");
    seenClassIds.add(entry.classId);
    const characterClass = classesById.get(entry.classId);
    if (!characterClass) throw new RangeError(`Unknown class: ${entry.classId}`);
    assertClassLevel(characterClass, entry.level);
    return { characterClass, level: entry.level };
  });
  const level = resolved.reduce((total, entry) => total + entry.level, 0);
  assertLevel(level);
  const saves = { fortitude: 0, reflex: 0, will: 0 };
  const features = [];
  let baseAttackBonusTotal = 0;
  let skillRanks = 0;
  for (const { characterClass, level: classLevel } of resolved) {
    baseAttackBonusTotal += classBaseAttackBonus(characterClass, classLevel);
    for (const save of Object.keys(saves)) saves[save] += classSavingThrow(characterClass, save, classLevel);
    skillRanks += skillRanksThroughLevel(characterClass, classLevel, intelligenceScore, {
      racialBonusPerLevel: racialSkillBonusPerLevel
    });
    features.push(...featuresThroughLevel(characterClass, classLevel).map(feature => ({
      ...feature,
      classId: characterClass.id,
      className: characterClass.name,
      classLevel
    })));
  }
  return {
    level,
    classLevels: resolved.map(({ characterClass, level: classLevel }) => ({
      classId: characterClass.id,
      className: characterClass.name,
      level: classLevel
    })),
    baseAttackBonus: baseAttackBonusTotal,
    saves,
    skillRanks,
    featSlots: featSlotsAtLevel(level, { bonusFeats }),
    features
  };
}

export function featuresAtLevel(characterClass, level) {
  assertLevel(level);
  return characterClass.features.filter(feature => feature.level === level);
}

export function featuresThroughLevel(characterClass, level) {
  assertLevel(level);
  return characterClass.features.filter(feature => feature.level <= level)
    .sort((a,b) => a.level-b.level || a.name.localeCompare(b.name));
}

export function availableOptions(group, classId, classLevel, selectedIds = [], context = {}) {
  assertLevel(classLevel);
  return group.options.filter(option =>
    option.classIds.includes(classId) &&
    option.minimumLevel <= classLevel &&
    prerequisitesMet(option.prerequisites, {classId, classLevel, selectedIds, ...context})
  );
}

export function featPrerequisiteResults(feat, context) {
  return feat.prerequisites.map(prerequisite => ({
    prerequisite,
    met: prerequisiteMet(prerequisite, context)
  }));
}

export function normalizeSelectedFeats(selectedFeatIds, feats, context, slotCount) {
  if (!Array.isArray(selectedFeatIds) || !Number.isInteger(slotCount) || slotCount < 0) return [];
  const byId = new Map(feats.map(feat => [feat.id, feat]));
  let result = selectedFeatIds.filter((id, index, ids) => typeof id === "string" && ids.indexOf(id) === index && byId.has(id)).slice(0, slotCount);
  let changed = true;
  while (changed) {
    changed = false;
    const next = result.filter(id => {
      const feat = byId.get(id);
      const eligible = prerequisitesMet(feat.prerequisites, { ...context, candidateId: id, selectedIds: result.filter(otherId => otherId !== id) });
      if (!eligible) changed = true;
      return eligible;
    });
    result = next;
  }
  return result;
}

export function normalizeSelectedFeatChoices(selectedFeatChoices, selectedFeatIds, feats) {
  if (!selectedFeatChoices || typeof selectedFeatChoices !== "object" || Array.isArray(selectedFeatChoices)) return {};
  const byId = new Map(feats.map(feat => [feat.id, feat]));
  return Object.fromEntries(Object.entries(selectedFeatChoices).flatMap(([featId, choice]) => {
    const feat = byId.get(featId);
    const options = feat?.choice?.options;
    const validChoice = typeof choice === "string" && (feat?.choice?.allowCustom ? choice.trim().length > 0 && choice.trim().length <= 80 : Array.isArray(options) && options.some(option => option.id === choice));
    return selectedFeatIds.includes(featId) && validChoice ? [[featId, feat?.choice?.allowCustom ? choice.trim() : choice]] : [];
  }));
}

export function prerequisitesMet(prerequisites, context) {
  return prerequisites.every(prerequisite => prerequisiteMet(prerequisite, context));
}

function prerequisiteMet(prerequisite, context) {
  if (prerequisite.type === "level") return context.classLevel >= prerequisite.minimum;
  if (prerequisite.type === "class-level") return (context.classLevels?.[prerequisite.classId] ?? (context.classId === prerequisite.classId ? context.classLevel : 0)) >= prerequisite.minimum;
  if (prerequisite.type === "ancestry") return context.ancestryId === prerequisite.id;
  if (prerequisite.type === "size") {
    const sizes = ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"];
    const size = sizes.indexOf(context.size);
    const minimum = prerequisite.minimum ? sizes.indexOf(prerequisite.minimum) : 0;
    const maximum = prerequisite.maximum ? sizes.indexOf(prerequisite.maximum) : sizes.length - 1;
    return size !== -1 && minimum !== -1 && maximum !== -1 && size >= minimum && size <= maximum;
  }
  if (prerequisite.type === "caster-level") return context.casterLevel >= prerequisite.minimum;
  if (prerequisite.type === "ability") return context.abilities?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "bab") return context.baseAttackBonus >= prerequisite.minimum;
  if (prerequisite.type === "skill") return context.skillRanks?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "feature") return context.featureIds?.includes(prerequisite.id);
  if (prerequisite.type === "feat") return context.selectedIds?.includes(prerequisite.id);
  if (prerequisite.type === "matching-choice") { const candidateChoice = context.selectedFeatChoices?.[context.candidateId]; const prerequisiteChoice = context.selectedFeatChoices?.[prerequisite.featId]; return candidateChoice === undefined || (prerequisiteChoice !== undefined && candidateChoice === prerequisiteChoice); }
  if (prerequisite.type === "choice-value") return context.selectedFeatChoices?.[prerequisite.featId] === prerequisite.value;
  if (prerequisite.type === "any") return prerequisite.prerequisites.some(alternative => prerequisiteMet(alternative, context));
  return true;
}

function assertLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
}

function isRankRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([name, ranks]) => typeof name === "string" && Number.isInteger(ranks) && ranks >= 0)) : {}; }
function isStringRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([name, id]) => typeof name === "string" && typeof id === "string")) : {}; }
function isStringArrayRecord(value, validKeys) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).flatMap(([key, entries]) => validKeys.has(key) && Array.isArray(entries) ? [[key, entries.filter(entry => typeof entry === "string")]] : [])) : {}; }
function isNestedRankRecord(value, validKeys) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).flatMap(([key, entries]) => validKeys.has(key) ? [[key, isRankRecord(entries)]] : [])) : {}; }
