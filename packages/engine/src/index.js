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

export function availableOptions(group, classId, classLevel, selectedIds = []) {
  assertLevel(classLevel);
  return group.options.filter(option =>
    option.classIds.includes(classId) &&
    option.minimumLevel <= classLevel &&
    prerequisitesMet(option.prerequisites, {classId, classLevel, selectedIds})
  );
}

export function prerequisitesMet(prerequisites, context) {
  return prerequisites.every(prerequisite => {
    if (prerequisite.type === "level") return context.classLevel >= prerequisite.minimum;
    if (prerequisite.type === "feature" || prerequisite.type === "feat") return context.selectedIds.includes(prerequisite.id);
    return true;
  });
}

function assertLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
}
