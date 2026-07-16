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

export function abilityModifier(score) {
  if (!Number.isInteger(score) || score < 1) throw new RangeError("Ability score must be a positive integer.");
  return Math.floor((score - 10) / 2);
}

export const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];

export function abilityModifiers(abilities) {
  return Object.fromEntries(abilityNames.map(name => [name, abilityModifier(abilities[name])]));
}

export function characterCombatStats(characterClass, level, abilities) {
  assertLevel(level);
  const modifiers = abilityModifiers(abilities);
  const bab = baseAttackBonus(characterClass.babProgression, level);
  const baseSaves = Object.fromEntries(Object.entries(characterClass.saves).map(([save, progression]) => [save, savingThrow(progression, level)]));
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

export function spellsAvailableToClass(spells, classId, maximumSpellLevel) {
  if (!Number.isInteger(maximumSpellLevel) || maximumSpellLevel < 0 || maximumSpellLevel > 9) throw new RangeError("Maximum spell level must be an integer from 0 to 9.");
  return spells.filter(spell => spell.levelByClass[classId] !== undefined && spell.levelByClass[classId] <= maximumSpellLevel)
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
  const bonusByLevel = Object.fromEntries(bonusSpellsPerDay(abilityScore, slots.length).map(entry => [entry.level, entry.count]));
  const baseSlots = slots.map((base, index) => ({ level: index + 1, base, bonus: bonusByLevel[index + 1] ?? 0, count: base + (bonusByLevel[index + 1] ?? 0) }));
  return {
    ability: spellcasting.ability,
    castingType: spellcasting.castingType,
    maximumSpellLevel: Math.min(Math.max(0, abilityScore - 10), Math.max(0, ...baseSlots.filter(entry => entry.base > 0).map(entry => entry.level))),
    slots: baseSlots.filter(entry => entry.count > 0),
    prepared: prepared.map((count, level) => ({ level, count })).filter(entry => entry.count > 0)
  };
}

export function normalizeCharacterDraft(value, { classIds = null, ancestryIds = null } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value;
  const validAbilities = abilityNames.every(name => Number.isInteger(draft.baseAbilities?.[name]) && draft.baseAbilities[name] >= 1 && draft.baseAbilities[name] <= 40);
  if (typeof draft.classId !== "string" || (classIds && !classIds.includes(draft.classId)) || !Number.isInteger(draft.level) || draft.level < 1 || draft.level > 20 || !validAbilities) return null;
  return {
    version: 1,
    name: typeof draft.name === "string" ? draft.name.slice(0, 120) : "",
    classId: draft.classId,
    ancestryId: typeof draft.ancestryId === "string" && (!ancestryIds || ancestryIds.includes(draft.ancestryId)) ? draft.ancestryId : "human",
    level: draft.level,
    humanAbility: abilityNames.includes(draft.humanAbility) ? draft.humanAbility : "intelligence",
    baseAbilities: draft.baseAbilities,
    selectedFeatIds: Array.isArray(draft.selectedFeatIds) ? draft.selectedFeatIds.filter(id => typeof id === "string") : [],
    skillRanks: isRankRecord(draft.skillRanks),
    selectedOptions: isStringRecord(draft.selectedOptions),
    preparedSpells: Array.isArray(draft.preparedSpells) ? draft.preparedSpells.filter(id => typeof id === "string") : [],
    spellSlotUses: isRankRecord(draft.spellSlotUses),
    arcaneReservoir: Number.isInteger(draft.arcaneReservoir) && draft.arcaneReservoir >= 0 ? draft.arcaneReservoir : null
  };
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
  return ranksPerLevel * (level + 3);
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

export function classProgression(characterClass, level, { intelligenceScore = 10, racialSkillBonusPerLevel = 0, bonusFeats = 0 } = {}) {
  assertLevel(level);
  return {
    level,
    baseAttackBonus: baseAttackBonus(characterClass.babProgression, level),
    saves: Object.fromEntries(Object.entries(characterClass.saves).map(([save, progression]) => [save, savingThrow(progression, level)])),
    skillRanks: skillRanksThroughLevel(characterClass, level, intelligenceScore, { racialBonusPerLevel: racialSkillBonusPerLevel }),
    featSlots: featSlotsAtLevel(level, { bonusFeats }),
    features: featuresThroughLevel(characterClass, level)
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
      const eligible = prerequisitesMet(feat.prerequisites, { ...context, selectedIds: result.filter(otherId => otherId !== id) });
      if (!eligible) changed = true;
      return eligible;
    });
    result = next;
  }
  return result;
}

export function prerequisitesMet(prerequisites, context) {
  return prerequisites.every(prerequisite => prerequisiteMet(prerequisite, context));
}

function prerequisiteMet(prerequisite, context) {
  if (prerequisite.type === "level") return context.classLevel >= prerequisite.minimum;
  if (prerequisite.type === "ability") return context.abilities?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "bab") return context.baseAttackBonus >= prerequisite.minimum;
  if (prerequisite.type === "feature" || prerequisite.type === "feat") return context.selectedIds?.includes(prerequisite.id);
  return true;
}

function assertLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
}

function isRankRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([name, ranks]) => typeof name === "string" && Number.isInteger(ranks) && ranks >= 0)) : {}; }
function isStringRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([name, id]) => typeof name === "string" && typeof id === "string")) : {}; }
