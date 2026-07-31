const boundedLevel = (level) => Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));
const nonNegativeModifier = (modifier) => Math.max(0, Math.trunc(Number(modifier) || 0));

export function apgClassResourceMaximums(classId, level, abilityModifiers = {}) {
  const classLevel = boundedLevel(level);
  switch (classId) {
    case "alchemist":
      return { bombs: Math.max(1, classLevel + nonNegativeModifier(abilityModifiers.intelligence)) };
    case "cavalier":
      return {
        challenges: Math.min(7, 1 + Math.floor((classLevel - 1) / 3)),
        tactician: classLevel >= 17 ? 3 : classLevel >= 9 ? 2 : 1
      };
    case "inquisitor":
      return {
        judgments: Math.min(7, 1 + Math.floor((classLevel - 1) / 3)),
        ...(classLevel >= 5 ? { baneRounds: classLevel } : {})
      };
    case "summoner":
      return {
        summonMonster: Math.max(1, 3 + Math.trunc(Number(abilityModifiers.charisma) || 0)),
        ...(classLevel >= 2 ? { bondSensesRounds: classLevel } : {}),
        ...(classLevel >= 6 ? { makersCall: 1 + Math.floor((classLevel - 6) / 4) } : {})
      };
    case "magus":
      return { arcanePool: Math.max(1, Math.floor(classLevel / 2) + nonNegativeModifier(abilityModifiers.intelligence)) };
    case "gunslinger":
      return { grit: Math.max(1, nonNegativeModifier(abilityModifiers.wisdom)) };
    case "samurai":
      return { challenges: Math.min(7, 1 + Math.floor((classLevel - 1) / 3)), resolve: Math.max(1, Math.floor(classLevel / 2)) };
    case "brawler":
      return {
        martialFlexibility: 3 + Math.floor(classLevel / 2),
        ...(classLevel >= 4 ? { knockout: 1 + (classLevel >= 10 ? 1 : 0) + (classLevel >= 16 ? 1 : 0) } : {})
      };
    case "swashbuckler":
      return {
        panache: Math.max(1, nonNegativeModifier(abilityModifiers.charisma)),
        ...(classLevel >= 2 ? { charmedLife: 3 + Math.floor((classLevel - 2) / 4) } : {})
      };
    case "bloodrager":
      return { bloodrageRounds: Math.max(1, 4 + nonNegativeModifier(abilityModifiers.constitution) + 2 * (classLevel - 1)) };
    case "investigator":
      return { inspiration: Math.max(1, Math.floor(classLevel / 2) + nonNegativeModifier(abilityModifiers.intelligence)) };
    case "skald":
      return {
        ragingSongRounds: Math.max(1, 3 + nonNegativeModifier(abilityModifiers.charisma) + 2 * (classLevel - 1)),
        ...(classLevel >= 5 ? { spellKenning: classLevel >= 17 ? 3 : classLevel >= 11 ? 2 : 1 } : {})
      };
    case "warpriest":
      return {
        blessingUses: 3 + Math.floor(classLevel / 2),
        ...(classLevel >= 2 ? { fervor: Math.max(1, Math.floor(classLevel / 2) + nonNegativeModifier(abilityModifiers.wisdom)) } : {})
      };
    default:
      return {};
  }
}

export function normalizeClassResourceUses(uses, maximums) {
  if (!uses || typeof uses !== "object" || Array.isArray(uses)) return {};
  return Object.fromEntries(Object.entries(maximums).map(([resourceId, maximum]) => {
    const value = Number.isInteger(uses[resourceId]) ? uses[resourceId] : 0;
    return [resourceId, Math.max(0, Math.min(maximum, value))];
  }));
}

export function normalizeClassResourcesByClass(usesByClass, classLevels, abilityModifiers = {}) {
  if (!usesByClass || typeof usesByClass !== "object" || Array.isArray(usesByClass)) return {};
  return Object.fromEntries(classLevels.flatMap(({ classId, level }) => {
    const maximums = apgClassResourceMaximums(classId, level, abilityModifiers);
    return Object.keys(maximums).length > 0
      ? [[classId, normalizeClassResourceUses(usesByClass[classId], maximums)]]
      : [];
  }));
}
