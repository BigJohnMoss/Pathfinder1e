import { normalizeCompanionState } from "./companions.js";
import { inferArchetypeResourceAdjustments } from "./archetype-resources.js";
import { inferArchetypeFeatAlternatives, inferArchetypeFeatChoices, inferArchetypeGrantedFeats } from "./archetype-feats.js";
export { animalCompanionProgression, familiarProgression, normalizeCompanionState } from "./companions.js";
export { eidolonProgression } from "./eidolon.js";
export { drakeCompanionProgression } from "./drake.js";
export { confirmCriticalThreat, parseCriticalThreatRange, parseDiceExpression, resolveAttackRoll, rollD20Check, rollDice, rollDiceExpression } from "./dice.js";
export { inferArchetypeResourceAdjustments };
export { inferArchetypeGrantedFeats };
export { inferArchetypeFeatChoices };
export { inferArchetypeFeatAlternatives };
export { extendedSpellDuration, isPersonalRangeSpell, isTransmutationSpell, spellHasDescriptor, spellHasSchool } from "./spell-modifiers.js";

export const adjustedCompanionLevel = (level, adjustment) => Math.max(
  adjustment.minimumEffectiveLevel ?? 1,
  Math.floor(level * adjustment.multiplier) + (adjustment.levelAdjustment ?? 0),
);

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
  if (level > maximumLevel)
    throw new RangeError(
      `${characterClass.name ?? "Class"} has a maximum level of ${maximumLevel}.`,
    );
}

export function classBaseAttackBonus(characterClass, level) {
  assertClassLevel(characterClass, level);
  return (
    characterClass.baseAttackBonusByLevel?.[level - 1] ??
    baseAttackBonus(characterClass.babProgression, level)
  );
}

export function classSavingThrow(characterClass, save, level) {
  assertClassLevel(characterClass, level);
  return (
    characterClass.savesByLevel?.[level - 1]?.[save] ??
    savingThrow(characterClass.saves[save], level)
  );
}

const divineSpellcastingClassIds = new Set([
  "cleric",
  "druid",
  "oracle",
  "paladin",
  "ranger",
]);

export function spellcastingTradition(characterClass) {
  if (!characterClass?.spellcasting) return null;
  return (
    characterClass.spellcasting.tradition ??
    (divineSpellcastingClassIds.has(characterClass.id) ? "divine" : "arcane")
  );
}

export function effectiveSpellcastingLevels(
  classes,
  classLevels,
  prestigeTargets = {},
) {
  const classesById = new Map(
    classes.map((characterClass) => [characterClass.id, characterClass]),
  );
  const levels = Object.fromEntries(
    classLevels.flatMap((entry) =>
      classesById.get(entry.classId)?.spellcasting
        ? [[entry.classId, entry.level]]
        : [],
    ),
  );
  for (const entry of classLevels) {
    const prestigeClass = classesById.get(entry.classId);
    const advancement = prestigeClass?.spellcastingAdvancement;
    if (!advancement) continue;
    const amount = advancement.levels.filter(
      (level) => level <= entry.level,
    ).length;
    if (amount === 0) continue;
    const eligible = classLevels
      .map((candidate) => candidate.classId)
      .filter((classId) => {
        if (classId === entry.classId) return false;
        const tradition = spellcastingTradition(classesById.get(classId));
        return (
          tradition &&
          (advancement.tradition === "any" ||
            advancement.tradition === tradition)
        );
      });
    const targetCount = advancement.targetCount ?? 1;
    const requested = Array.isArray(prestigeTargets[entry.classId])
      ? prestigeTargets[entry.classId]
      : [];
    const targets = advancement.targetTraditions
      ? advancement.targetTraditions
          .flatMap((requiredTradition, targetIndex) => {
            const candidates = eligible.filter(
              (classId) =>
                spellcastingTradition(classesById.get(classId)) ===
                requiredTradition,
            );
            const requestedClassId = requested[targetIndex];
            if (requestedClassId && candidates.includes(requestedClassId))
              return [requestedClassId];
            return candidates.length === 1 ? [candidates[0]] : [];
          })
          .filter(
            (classId, index, selected) => selected.indexOf(classId) === index,
          )
      : [
          ...new Set(requested.filter((classId) => eligible.includes(classId))),
        ].slice(0, targetCount);
    if (
      !advancement.targetTraditions &&
      targets.length === 0 &&
      eligible.length === targetCount
    )
      targets.push(...eligible);
    for (const classId of targets)
      levels[classId] = Math.min(20, (levels[classId] ?? 0) + amount);
  }
  return levels;
}

export function abilityModifier(score) {
  if (!Number.isInteger(score) || score < 1)
    throw new RangeError("Ability score must be a positive integer.");
  return Math.floor((score - 10) / 2);
}

export const abilityNames = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
const pointBuyCosts = {
  7: -4,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 5,
  15: 7,
  16: 10,
  17: 13,
  18: 17,
};

export function abilityScorePointCost(score) {
  if (!Number.isInteger(score) || pointBuyCosts[score] === undefined)
    throw new RangeError(
      "Point-buy ability score must be an integer from 7 to 18.",
    );
  return pointBuyCosts[score];
}

export function pointBuySummary(abilities, budget = 15) {
  if (![10, 15, 20, 25].includes(budget))
    throw new RangeError("Point-buy budget must be 10, 15, 20, or 25.");
  const spent = abilityNames.reduce(
    (total, ability) => total + abilityScorePointCost(abilities[ability]),
    0,
  );
  return { budget, spent, remaining: budget - spent, valid: spent <= budget };
}

export function abilityBoostCount(level) {
  assertLevel(level);
  return Math.floor(level / 4);
}

export function normalizeAbilityBoosts(boosts, level) {
  const count = abilityBoostCount(level);
  return Array.isArray(boosts)
    ? boosts.filter((ability) => abilityNames.includes(ability)).slice(0, count)
    : [];
}

export function abilityModifiers(abilities) {
  return Object.fromEntries(
    abilityNames.map((name) => [name, abilityModifier(abilities[name])]),
  );
}

export function characterCombatStats(characterClass, level, abilities) {
  assertClassLevel(characterClass, level);
  const modifiers = abilityModifiers(abilities);
  const bab = classBaseAttackBonus(characterClass, level);
  const baseSaves = Object.fromEntries(
    Object.keys(characterClass.saves).map((save) => [
      save,
      classSavingThrow(characterClass, save, level),
    ]),
  );
  return {
    abilityModifiers: modifiers,
    baseAttackBonus: bab,
    saves: {
      fortitude: baseSaves.fortitude + modifiers.constitution,
      reflex: baseSaves.reflex + modifiers.dexterity,
      will: baseSaves.will + modifiers.wisdom,
    },
    initiative: modifiers.dexterity,
    armorClass: {
      normal: 10 + modifiers.dexterity,
      touch: 10 + modifiers.dexterity,
      flatFooted: 10,
    },
    combatManeuverBonus: bab + modifiers.strength,
    combatManeuverDefense: 10 + bab + modifiers.strength + modifiers.dexterity,
    averageHitPoints: averageHitPoints(
      characterClass.hitDie,
      level,
      modifiers.constitution,
    ),
  };
}

export function averageHitPoints(hitDie, level, constitutionModifier = 0) {
  assertLevel(level);
  if (!Number.isInteger(hitDie) || ![6, 8, 10, 12].includes(hitDie))
    throw new RangeError("Hit Die must be d6, d8, d10, or d12.");
  if (!Number.isInteger(constitutionModifier))
    throw new RangeError("Constitution modifier must be an integer.");
  const laterLevelGain = Math.max(
    1,
    Math.floor(hitDie / 2) + 1 + constitutionModifier,
  );
  return (
    Math.max(1, hitDie + constitutionModifier) + (level - 1) * laterLevelGain
  );
}

export function multiclassAverageHitPoints(
  classes,
  classLevels,
  constitutionModifier = 0,
) {
  if (
    !Array.isArray(classes) ||
    !Array.isArray(classLevels) ||
    classLevels.length === 0 ||
    !Number.isInteger(constitutionModifier)
  ) {
    throw new RangeError(
      "Valid class levels and a Constitution modifier are required.",
    );
  }
  const classesById = new Map(
    classes.map((characterClass) => [characterClass.id, characterClass]),
  );
  let firstCharacterLevel = true;
  return classLevels.reduce((total, entry) => {
    const characterClass = classesById.get(entry?.classId);
    if (!characterClass || !Number.isInteger(entry.level) || entry.level < 1)
      throw new RangeError("Each class level entry must be valid.");
    const laterLevelGain = Math.max(
      1,
      Math.floor(characterClass.hitDie / 2) + 1 + constitutionModifier,
    );
    const classHitPoints = firstCharacterLevel
      ? Math.max(1, characterClass.hitDie + constitutionModifier) +
        (entry.level - 1) * laterLevelGain
      : entry.level * laterLevelGain;
    firstCharacterLevel = false;
    return total + classHitPoints;
  }, 0);
}

const lightLoads = [
  3, 6, 10, 13, 16, 20, 23, 26, 30, 33, 38, 43, 50, 58, 66, 76, 86, 100, 116,
  133, 153, 173, 200, 233, 266, 306, 346, 400, 466,
];

export function carryingCapacity(strength) {
  if (!Number.isInteger(strength) || strength < 1)
    throw new RangeError("Strength must be a positive integer.");
  const multiplier = Math.pow(4, Math.floor(Math.max(0, strength - 20) / 10));
  const tableStrength = strength <= 29 ? strength : 20 + ((strength - 20) % 10);
  const light = lightLoads[tableStrength - 1] * multiplier;
  return { light, medium: light * 2, heavy: light * 3 };
}

export function encumbrance(strength, items) {
  const capacity = carryingCapacity(strength);
  const carriedWeight = items.reduce(
    (total, item) => total + item.weight * item.quantity,
    0,
  );
  const load =
    carriedWeight <= capacity.light
      ? "light"
      : carriedWeight <= capacity.medium
        ? "medium"
        : carriedWeight <= capacity.heavy
          ? "heavy"
          : "overloaded";
  return { carriedWeight, capacity, load };
}

const archetypeLevel = (archetype, classLevels = {}) =>
  Math.max(0, Number(classLevels?.[archetype?.classId]) || 0);

const adjustmentAppliesAtLevel = (adjustment, level) =>
  level >= (adjustment.minimumLevel ?? 1) &&
  (adjustment.maximumLevel === undefined || level <= adjustment.maximumLevel);

export function archetypeConditionalModifiers(archetypes = [], classLevels = {}) {
  return (archetypes ?? []).flatMap((archetype) => {
    const level = archetypeLevel(archetype, classLevels);
    return (archetype?.conditionalModifiers ?? []).flatMap((modifier) => {
      if (!adjustmentAppliesAtLevel(modifier, level)) return [];
      const interval = Math.max(1, modifier.interval ?? 1);
      const increases = Math.floor((level - (modifier.minimumLevel ?? 1)) / interval);
      const bonus = Math.min(
        modifier.maximum ?? Number.POSITIVE_INFINITY,
        modifier.base + increases * (modifier.perInterval ?? 0),
      );
      return [{
        label: modifier.label,
        condition: modifier.condition,
        bonus,
        source: archetype.name,
      }];
    });
  });
}

export function archetypeSkillBonuses(archetypes = [], classLevels = {}) {
  const result = { skillBonuses: {}, conditionalModifiers: [] };
  for (const archetype of archetypes ?? []) {
    const level = archetypeLevel(archetype, classLevels);
    for (const adjustment of archetype?.skillBonusAdjustments ?? []) {
      if (!adjustmentAppliesAtLevel(adjustment, level)) continue;
      const interval = Math.max(1, adjustment.interval ?? 1);
      const increases = Math.floor((level - (adjustment.minimumLevel ?? 1)) / interval);
      const calculated = adjustment.levelDivisor
        ? adjustment.base + Math.floor(level / adjustment.levelDivisor) * (adjustment.levelMultiplier ?? 1)
        : adjustment.base + increases * (adjustment.perInterval ?? 0);
      const bonus = Math.min(
        adjustment.maximum ?? Number.POSITIVE_INFINITY,
        Math.max(adjustment.minimum ?? Number.NEGATIVE_INFINITY, calculated),
      );
      if (adjustment.condition) result.conditionalModifiers.push({
        label: `${adjustment.skill} checks`,
        condition: adjustment.condition,
        bonus,
        source: archetype.name,
      });
      else result.skillBonuses[adjustment.skill] = (result.skillBonuses[adjustment.skill] ?? 0) + bonus;
    }
  }
  return result;
}

const armorOrLoadReducesSpeed = (armorCategory, load) =>
  ["medium", "heavy"].includes(armorCategory) || ["medium", "heavy"].includes(load);

const reducedLandSpeed = (speed) => Math.ceil((speed * 2) / 3 / 5) * 5;

export function characterLandSpeed(baseSpeed, armorCategory = "none", load = "light", archetypes = [], classLevels = {}) {
  if (!Number.isInteger(baseSpeed) || baseSpeed < 0)
    throw new RangeError("Base land speed must be a non-negative integer.");
  const adjustments = (archetypes ?? []).flatMap((archetype) => {
    const level = archetypeLevel(archetype, classLevels);
    return (archetype?.landSpeedAdjustments ?? [])
      .filter((adjustment) => adjustmentAppliesAtLevel(adjustment, level))
      .filter((adjustment) => !adjustment.armorCategories?.length || adjustment.armorCategories.includes(armorCategory))
      .filter((adjustment) => !adjustment.prohibitedLoads?.includes(load))
      .map((adjustment) => ({ ...adjustment, source: archetype.name }));
  });
  if (load === "overloaded") return { speed: 0, baseSpeed, armorCategory, load, adjustments: [] };
  const beforeReduction = adjustments
    .filter((adjustment) => adjustment.timing === "beforeReduction")
    .reduce((total, adjustment) => total + adjustment.bonus, baseSpeed);
  let speed = armorOrLoadReducesSpeed(armorCategory, load)
    ? reducedLandSpeed(beforeReduction)
    : beforeReduction;
  for (const adjustment of adjustments.filter((item) => item.timing === "afterReduction")) {
    speed += adjustment.bonus;
    if (adjustment.capAtBaseSpeed) speed = Math.min(speed, baseSpeed);
  }
  return { speed, baseSpeed, armorCategory, load, adjustments };
}

export function spellsAvailableToClass(
  spells,
  classId,
  maximumSpellLevel,
  spellListAdditions = {},
) {
  if (
    !Number.isInteger(maximumSpellLevel) ||
    maximumSpellLevel < 0 ||
    maximumSpellLevel > 9
  )
    throw new RangeError("Maximum spell level must be an integer from 0 to 9.");
  return spells
    .map((spell) =>
      spellListAdditions[spell.id] === undefined
        ? spell
        : {
            ...spell,
            levelByClass: {
              ...spell.levelByClass,
              [classId]: spellListAdditions[spell.id],
            },
          },
    )
    .filter(
      (spell) =>
        spell.levelByClass[classId] !== undefined &&
        spell.levelByClass[classId] <= maximumSpellLevel,
    )
    .sort(
      (a, b) =>
        a.levelByClass[classId] - b.levelByClass[classId] ||
        a.name.localeCompare(b.name),
    );
}

export function normalizePreparedSpells(
  preparedSpellIds,
  spells,
  classId,
  preparedLimits,
) {
  const limits = new Map(
    preparedLimits.map((entry) => [entry.level, entry.count]),
  );
  const available = new Map(
    spells
      .filter((spell) => spell.levelByClass[classId] !== undefined)
      .map((spell) => [spell.id, spell]),
  );
  const preparedByLevel = new Map();
  return preparedSpellIds.filter((id) => {
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
  const counts = new Map(slots.map((slot) => [slot.level, slot.count]));
  if (!slotUses || typeof slotUses !== "object" || Array.isArray(slotUses))
    return {};
  return Object.fromEntries(
    Object.entries(slotUses).flatMap(([rawLevel, used]) => {
      const level = Number(rawLevel);
      const count = counts.get(level);
      return Number.isInteger(level) &&
        Number.isInteger(used) &&
        used > 0 &&
        count
        ? [[level, Math.min(used, count)]]
        : [];
    }),
  );
}

export function arcaneReservoir(level) {
  assertLevel(level);
  return { maximum: 3 + level, dailyRefresh: 3 + Math.floor(level / 2) };
}

export { bardicPerformanceRounds } from "./bardic-performance.js";
export { druidWildShapeUses } from "./druid-wild-shape.js";
export {
  apgClassResourceMaximums,
  applyArchetypeResourceAdjustments,
  normalizeClassResourceUses,
  normalizeClassResourcesByClass,
} from "./apg-class-resources.js";
export {
  eidolonEvolutionPool,
  eidolonBaseForm,
  validateEidolonEvolutions,
} from "./eidolon.js";
export { witchPatronSpells } from "./witch-patrons.js";
export {
  preparedSourceSpellCapacity,
  normalizePreparedSourceSpells,
  preparedSourceAvailableSpells,
} from "./prepared-source-spells.js";

export function bonusSpellsPerDay(abilityScore, maximumSpellLevel) {
  if (
    !Number.isInteger(maximumSpellLevel) ||
    maximumSpellLevel < 0 ||
    maximumSpellLevel > 9
  )
    throw new RangeError("Maximum spell level must be an integer from 0 to 9.");
  const modifier = abilityModifier(abilityScore);
  return Array.from({ length: maximumSpellLevel }, (_, index) => {
    const level = index + 1;
    return {
      level,
      count: modifier < level ? 0 : Math.floor((modifier - level) / 4) + 1,
    };
  }).filter((entry) => entry.count > 0);
}

export function spellSaveDC(abilityScore, spellLevel) {
  if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9)
    throw new RangeError("Spell level must be an integer from 0 to 9.");
  return 10 + spellLevel + abilityModifier(abilityScore);
}

export function spellcastingProgression(
  characterClass,
  level,
  { abilityScore = 10 } = {},
) {
  assertLevel(level);
  const spellcasting = characterClass.spellcasting;
  if (!spellcasting) return null;
  const slots = spellcasting.slotsByLevel?.[level - 1];
  const prepared = spellcasting.preparedByLevel?.[level - 1];
  if (!Array.isArray(slots) || !Array.isArray(prepared))
    throw new Error("Spellcasting progression is incomplete.");
  const unlocks = spellcasting.spellLevelUnlocks;
  const bonusByLevel = Object.fromEntries(
    bonusSpellsPerDay(abilityScore, slots.length).map((entry) => [
      entry.level,
      entry.count,
    ]),
  );
  const baseSlots = slots.map((base, index) => {
    const spellLevel = index + 1;
    const unlocked =
      !Array.isArray(unlocks) ||
      level >= (unlocks[index] ?? Number.POSITIVE_INFINITY);
    const bonus = unlocked ? (bonusByLevel[spellLevel] ?? 0) : 0;
    return {
      level: spellLevel,
      base: unlocked ? base : 0,
      bonus,
      count: (unlocked ? base : 0) + bonus,
    };
  });
  const preparedSlots = spellcasting.preparesFromSlots
    ? [
        { level: 0, count: prepared[0] ?? 0 },
        ...baseSlots.map(({ level: spellLevel, count }) => ({
          level: spellLevel,
          count,
        })),
      ]
    : prepared.map((count, spellLevel) => ({ level: spellLevel, count }));
  const accessibleSpellLevels = Array.isArray(unlocks)
    ? baseSlots.filter((entry) => entry.count > 0)
    : baseSlots.filter((entry) => entry.base > 0);
  return {
    ability: spellcasting.ability,
    castingType: spellcasting.castingType,
    maximumSpellLevel: Math.min(
      Math.max(0, abilityScore - 10),
      Math.max(0, ...accessibleSpellLevels.map((entry) => entry.level)),
    ),
    slots: baseSlots.filter((entry) => entry.count > 0),
    prepared: preparedSlots.filter((entry) => entry.count > 0),
  };
}

export function normalizeCharacterDraft(
  value,
  {
    classIds = null,
    ancestryIds = null,
    archetypeIds = null,
    archetypeIdsByClass = null,
  } = {},
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value;
  if (draft.version !== undefined && draft.version !== 1) return null;
  const validAbilities = abilityNames.every(
    (name) =>
      Number.isInteger(draft.baseAbilities?.[name]) &&
      draft.baseAbilities[name] >= 7 &&
      draft.baseAbilities[name] <= 18,
  );
  if (
    typeof draft.classId !== "string" ||
    (classIds && !classIds.includes(draft.classId)) ||
    !Number.isInteger(draft.level) ||
    draft.level < 1 ||
    draft.level > 20 ||
    !validAbilities
  )
    return null;
  const normalizedClassLevels = (() => {
    if (!Array.isArray(draft.classLevels) || draft.classLevels.length === 0)
      return [{ classId: draft.classId, level: draft.level }];
    const seen = new Set();
    const entries = draft.classLevels.flatMap((entry) => {
      if (
        !entry ||
        typeof entry.classId !== "string" ||
        seen.has(entry.classId) ||
        (classIds && !classIds.includes(entry.classId)) ||
        !Number.isInteger(entry.level) ||
        entry.level < 1 ||
        entry.level > 20
      )
        return [];
      seen.add(entry.classId);
      return [{ classId: entry.classId, level: entry.level }];
    });
    const totalLevel = entries.reduce((total, entry) => total + entry.level, 0);
    return entries.length === draft.classLevels.length &&
      entries[0]?.classId === draft.classId &&
      totalLevel === draft.level
      ? entries
      : [{ classId: draft.classId, level: draft.level }];
  })();
  const preparedSpells = Array.isArray(draft.preparedSpells)
    ? draft.preparedSpells.filter((id) => typeof id === "string")
    : [];
  const spellSlotUses = isRankRecord(draft.spellSlotUses);
  const validClassIds = new Set(
    normalizedClassLevels.map((entry) => entry.classId),
  );
  const normalizedArchetypeIdsByClass = Object.fromEntries(
    Object.entries(isStringRecord(draft.archetypeIdsByClass)).filter(
      ([selectedClassId, selectedArchetypeId]) =>
        validClassIds.has(selectedClassId) &&
        (!archetypeIdsByClass ||
          archetypeIdsByClass[selectedClassId]?.includes(selectedArchetypeId)),
    ),
  );
  const normalizedArchetypeStacksByClass = Object.fromEntries(
    Object.entries(
      isStringArrayRecord(draft.archetypeStacksByClass, validClassIds),
    ).flatMap(([selectedClassId, selectedArchetypeIds]) => {
      const validIds = [
        ...new Set(
          selectedArchetypeIds.filter(
            (selectedArchetypeId) =>
              !archetypeIdsByClass ||
              archetypeIdsByClass[selectedClassId]?.includes(
                selectedArchetypeId,
              ),
          ),
        ),
      ];
      return validIds.length ? [[selectedClassId, validIds]] : [];
    }),
  );
  const legacyArchetypeId =
    typeof draft.archetypeId === "string" &&
    (!archetypeIds || archetypeIds.includes(draft.archetypeId))
      ? draft.archetypeId
      : "";
  if (!normalizedArchetypeIdsByClass[draft.classId] && legacyArchetypeId)
    normalizedArchetypeIdsByClass[draft.classId] = legacyArchetypeId;
  for (const [selectedClassId, selectedArchetypeId] of Object.entries(
    normalizedArchetypeIdsByClass,
  )) {
    normalizedArchetypeStacksByClass[selectedClassId] = [
      ...new Set([
        selectedArchetypeId,
        ...(normalizedArchetypeStacksByClass[selectedClassId] ?? []),
      ]),
    ];
  }
  const preparedSpellsByClass = isStringArrayRecord(
    draft.preparedSpellsByClass,
    validClassIds,
  );
  const knownPreparedSpellsByClass = isStringArrayRecord(
    draft.knownPreparedSpellsByClass,
    validClassIds,
  );
  const spellSlotUsesByClass = isNestedRankRecord(
    draft.spellSlotUsesByClass,
    validClassIds,
  );
  const classResourceUsesByClass = isNestedRankRecord(
    draft.classResourceUsesByClass,
    validClassIds,
  );
  const prestigeSpellcastingTargets = Object.fromEntries(
    Object.entries(
      isStringArrayRecord(draft.prestigeSpellcastingTargets, validClassIds),
    ).map(([prestigeClassId, targetIds]) => [
      prestigeClassId,
      [
        ...new Set(
          targetIds.filter(
            (classId) =>
              validClassIds.has(classId) && classId !== prestigeClassId,
          ),
        ),
      ].slice(0, 2),
    ]),
  );
  if (!preparedSpellsByClass[draft.classId])
    preparedSpellsByClass[draft.classId] = preparedSpells;
  if (!spellSlotUsesByClass[draft.classId])
    spellSlotUsesByClass[draft.classId] = spellSlotUses;
  const favoredClassLevel =
    normalizedClassLevels.find((entry) => entry.classId === draft.classId)
      ?.level ?? draft.level;
  const favoredClassHitPoints =
    Number.isInteger(draft.favoredClassHitPoints) &&
    draft.favoredClassHitPoints > 0
      ? Math.min(favoredClassLevel, draft.favoredClassHitPoints)
      : 0;
  const favoredClassSkillRanks =
    Number.isInteger(draft.favoredClassSkillRanks) &&
    draft.favoredClassSkillRanks > 0
      ? Math.min(
          Math.max(0, favoredClassLevel - favoredClassHitPoints),
          draft.favoredClassSkillRanks,
        )
      : 0;
  let favoredClassRemaining =
    favoredClassLevel - favoredClassHitPoints - favoredClassSkillRanks;
  const favoredClassAlternateBonuses = {};
  if (
    draft.favoredClassAlternateBonuses &&
    typeof draft.favoredClassAlternateBonuses === "object" &&
    !Array.isArray(draft.favoredClassAlternateBonuses)
  ) {
    for (const [id, value] of Object.entries(
      draft.favoredClassAlternateBonuses,
    )) {
      if (
        !id ||
        !Number.isInteger(value) ||
        value <= 0 ||
        favoredClassRemaining <= 0
      )
        continue;
      favoredClassAlternateBonuses[id] = Math.min(value, favoredClassRemaining);
      favoredClassRemaining -= favoredClassAlternateBonuses[id];
    }
  }
  const hasSpellSpecialist = (
    normalizedArchetypeStacksByClass.arcanist ?? []
  ).includes("arcanist-spell-specialist");
  const arcanistClassLevel =
    normalizedClassLevels.find((entry) => entry.classId === "arcanist")
      ?.level ?? 0;
  const signatureSpellHighestClassLevel =
    hasSpellSpecialist &&
    Number.isInteger(draft.signatureSpellHighestClassLevel) &&
    draft.signatureSpellHighestClassLevel >= 1 &&
    draft.signatureSpellHighestClassLevel <= 20
      ? draft.signatureSpellHighestClassLevel
      : null;
  const signatureSpellExchangeCredits =
    signatureSpellHighestClassLevel !== null &&
    signatureSpellHighestClassLevel <= arcanistClassLevel &&
    Number.isInteger(draft.signatureSpellExchangeCredits) &&
    draft.signatureSpellExchangeCredits > 0
      ? Math.min(
          signatureSpellHighestClassLevel - 1,
          draft.signatureSpellExchangeCredits,
        )
      : 0;
  return {
    version: 1,
    name: typeof draft.name === "string" ? draft.name.slice(0, 120) : "",
    classId: draft.classId,
    classLevels: normalizedClassLevels,
    archetypeId:
      normalizedArchetypeIdsByClass[draft.classId] ?? legacyArchetypeId,
    archetypeIdsByClass: normalizedArchetypeIdsByClass,
    archetypeStacksByClass: normalizedArchetypeStacksByClass,
    prestigeSpellcastingTargets,
    ancestryId:
      typeof draft.ancestryId === "string" &&
      (!ancestryIds || ancestryIds.includes(draft.ancestryId))
        ? draft.ancestryId
        : "human",
    selectedAlternateRacialTraitIds: Array.isArray(
      draft.selectedAlternateRacialTraitIds,
    )
      ? draft.selectedAlternateRacialTraitIds.filter(
          (id) => typeof id === "string",
        )
      : [],
    level: draft.level,
    humanAbility: abilityNames.includes(draft.humanAbility)
      ? draft.humanAbility
      : "intelligence",
    baseAbilities: draft.baseAbilities,
    pointBuyBudget: [10, 15, 20, 25].includes(draft.pointBuyBudget)
      ? draft.pointBuyBudget
      : 15,
    abilityBoosts: normalizeAbilityBoosts(draft.abilityBoosts, draft.level),
    favoredClassHitPoints,
    favoredClassSkillRanks,
    favoredClassAlternateBonuses,
    selectedFeatIds: Array.isArray(draft.selectedFeatIds)
      ? draft.selectedFeatIds.filter((id) => typeof id === "string")
      : [],
    selectedTraitIds: Array.isArray(draft.selectedTraitIds)
      ? draft.selectedTraitIds.filter((id) => typeof id === "string")
      : [],
    selectedTraitChoices: isStringRecord(draft.selectedTraitChoices),
    selectedFeatChoices: isStringRecord(draft.selectedFeatChoices),
    skillRanks: isRankRecord(draft.skillRanks),
    selectedOptions: isStringRecord(draft.selectedOptions),
    signatureSpellHighestClassLevel,
    signatureSpellExchangeCredits,
    preparedSpells,
    preparedSpellsByClass,
    knownPreparedSpellsByClass,
    spellSlotUses,
    spellSlotUsesByClass,
    classResourceUsesByClass,
    companions: normalizeCompanionState(draft.companions),
    eidolon: validClassIds.has("summoner")
      ? {
          size: draft.eidolon?.size === "Small" ? "Small" : "Medium",
          evolutionIds: Array.isArray(draft.eidolon?.evolutionIds)
            ? [
                ...new Set(
                  draft.eidolon.evolutionIds.filter(
                    (id) => typeof id === "string",
                  ),
                ),
              ]
            : [],
        }
      : undefined,
    arcaneReservoir:
      Number.isInteger(draft.arcaneReservoir) && draft.arcaneReservoir >= 0
        ? draft.arcaneReservoir
        : null,
    bardicPerformanceUsed:
      Number.isInteger(draft.bardicPerformanceUsed) &&
      draft.bardicPerformanceUsed >= 0
        ? draft.bardicPerformanceUsed
        : 0,
    wildShapeUsed:
      Number.isInteger(draft.wildShapeUsed) && draft.wildShapeUsed >= 0
        ? draft.wildShapeUsed
        : 0,
    currentHitPoints:
      Number.isInteger(draft.currentHitPoints) && draft.currentHitPoints >= 0
        ? Math.min(9999, draft.currentHitPoints)
        : null,
    temporaryHitPoints:
      Number.isInteger(draft.temporaryHitPoints) &&
      draft.temporaryHitPoints >= 0
        ? Math.min(9999, draft.temporaryHitPoints)
        : 0,
    activeEffects: Array.isArray(draft.activeEffects)
      ? draft.activeEffects
          .filter(
            (effect) =>
              effect &&
              typeof effect.id === "string" &&
              typeof effect.name === "string" &&
              effect.name.trim() &&
              [
                "initiative",
                "armorClass",
                "fortitude",
                "reflex",
                "will",
                "attackRolls",
                "damageRolls",
                "spellResistance",
                "casterLevel",
                "spellSaveDc",
                "exploitEffectiveLevel",
                "casterLevelChecks",
                "savingThrows",
                "meleeDamageRolls",
                "healingReceived",
                "skillChecks",
                "strength",
                "dexterity",
                "constitution",
                "intelligence",
                "wisdom",
                "charisma",
                "allies",
                "self",
                "area",
                "enemy",
              ].includes(effect.target) &&
              Number.isInteger(effect.bonus) &&
              effect.bonus >= -20 &&
              effect.bonus <= (effect.target === "spellResistance" ? 99 : 20) &&
              (effect.target !== "allies" ||
                ((Number.isInteger(effect.fastHealing) &&
                  effect.fastHealing > 0 &&
                  effect.fastHealing <= 20) ||
                  (typeof effect.description === "string" && effect.description.trim()))) &&
              (!["self", "area", "enemy", "allies"].includes(effect.target) ||
                (typeof effect.description === "string" &&
                  effect.description.trim())) &&
              Number.isInteger(effect.roundsRemaining) &&
              effect.roundsRemaining > 0,
          )
          .slice(0, 20)
          .map((effect) => ({
            id: effect.id.slice(0, 80),
            name: effect.name.trim().slice(0, 80),
            target: effect.target,
            bonus: effect.bonus,
            roundsRemaining: Math.min(999, effect.roundsRemaining),
            ...(typeof effect.description === "string" && effect.description.trim()
              ? { description: effect.description.trim().slice(0, 240) }
              : {}),
            ...(Number.isInteger(effect.fastHealing) &&
            effect.fastHealing > 0 &&
            effect.fastHealing <= 20
              ? { fastHealing: effect.fastHealing }
              : {}),
            ...(Array.isArray(effect.weaponIds)
              ? { weaponIds: [...new Set(effect.weaponIds.filter((id) => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))].slice(0, 10) }
              : {}),
            ...(typeof effect.damageType === "string" && ["cold", "electricity", "fire", "sonic", "force"].includes(effect.damageType)
              ? { damageType: effect.damageType }
              : {}),
            ...(Number.isInteger(effect.temporaryHitPointsGranted) && effect.temporaryHitPointsGranted > 0 && effect.temporaryHitPointsGranted <= 9999
              ? { temporaryHitPointsGranted: effect.temporaryHitPointsGranted }
              : {}),
            ...(effect.consumeOnUse === true ? { consumeOnUse: true } : {}),
            ...(effect.expiresWhenTemporaryHitPointsLost === true ? { expiresWhenTemporaryHitPointsLost: true } : {}),
            ...(Number.isInteger(effect.retaliationDamage) && effect.retaliationDamage > 0 && effect.retaliationDamage <= 9999
              ? { retaliationDamage: effect.retaliationDamage }
              : {}),
            ...(typeof effect.retaliationDamageType === "string" && effect.retaliationDamageType.trim()
              ? { retaliationDamageType: effect.retaliationDamageType.trim().slice(0, 40) }
              : {}),
            ...(effect.deathRelease === true ? { deathRelease: true } : {}),
            ...(effect.d20Check && typeof effect.d20Check.label === "string" && effect.d20Check.label.trim() && Number.isInteger(effect.d20Check.modifier) && effect.d20Check.modifier >= -99 && effect.d20Check.modifier <= 99 && Number.isInteger(effect.d20Check.targetDc) && effect.d20Check.targetDc >= 1 && effect.d20Check.targetDc <= 999
              ? { d20Check: { label: effect.d20Check.label.trim().slice(0, 80), modifier: effect.d20Check.modifier, targetDc: effect.d20Check.targetDc, ...(Number.isInteger(effect.d20Check.maximumSpellLevel) && effect.d20Check.maximumSpellLevel >= 0 && effect.d20Check.maximumSpellLevel <= 9 ? { maximumSpellLevel: effect.d20Check.maximumSpellLevel } : {}) } }
              : {}),
          }))
      : [],
    inventory: Array.isArray(draft.inventory)
      ? draft.inventory
          .filter(
            (entry) =>
              entry &&
              typeof entry.itemId === "string" &&
              Number.isInteger(entry.quantity) &&
              entry.quantity > 0,
          )
          .map((entry) => ({
            itemId: entry.itemId,
            quantity: Math.min(999, entry.quantity),
            equipped: entry.equipped === true,
            ...(Number.isInteger(entry.enhancementBonus) &&
            entry.enhancementBonus > 0
              ? { enhancementBonus: Math.min(5, entry.enhancementBonus) }
              : {}),
          }))
      : [],
    coins: Object.fromEntries(
      ["cp", "sp", "gp", "pp"].map((coin) => [
        coin,
        Number.isInteger(draft.coins?.[coin]) && draft.coins[coin] >= 0
          ? draft.coins[coin]
          : 0,
      ]),
    ),
  };
}

export function applyArchetype(characterClass, archetype) {
  if (!archetype || archetype.classId !== characterClass.id)
    return characterClass;
  const featureIds = new Set(
    archetype.replacements.flatMap(
      (replacement) => replacement.featureIds ?? [],
    ),
  );
  const progressionKeys = new Set(
    archetype.replacements.flatMap(
      (replacement) => replacement.progressionKeys ?? [],
    ),
  );
  const overrides = new Map(
    (archetype.featureOverrides ?? []).map((override) => [
      override.featureId,
      override,
    ]),
  );
  const retained = characterClass.features
    .filter(
      (feature) =>
        !featureIds.has(feature.id) &&
        !progressionKeys.has(feature.progressionKey),
    )
    .map((feature) => {
      const overridden = overrides.has(feature.id)
        ? { ...feature, summary: overrides.get(feature.id).summary }
        : feature;
      return feature.progressionKey === "druid-wild-shape" &&
        archetype.wildShapeLevelAdjustment
        ? {
            ...overridden,
            level: feature.level - archetype.wildShapeLevelAdjustment,
          }
        : overridden;
    })
    .filter((feature) => feature.level <= 20);
  const replacements = archetype.replacements.flatMap(
    (replacement) => replacement.features,
  );
  const adjustTable = (table, adjustment) =>
    adjustment === undefined
      ? table
      : table?.map((row) => row.map((value) => Math.max(0, value + adjustment)));
  const baseSpellcasting = archetype.removesSpellcasting
    ? undefined
    : characterClass.spellcasting;
  const preparedAdjustment = archetype.preparedSpellAdjustmentPerLevel ??
    (baseSpellcasting?.castingType === "prepared" && !baseSpellcasting.preparesFromSlots
      ? archetype.spellSlotAdjustmentPerLevel
      : undefined);
  const hasStructuredClassSkills = archetype.classSkillAdditions?.length || archetype.classSkillRemovals?.length;
  const inferredClassSkills = hasStructuredClassSkills
    ? { additions: [], removals: [] }
    : inferArchetypeClassSkillChanges(archetype);
  const inferredProficiencies = archetype.proficiencyAdjustments?.length
    ? []
    : inferArchetypeProficiencyAdjustments(archetype);
  const inferredSkillRanks = archetype.skillRanksPerLevel === undefined
    ? inferArchetypeSkillRankAdjustment(archetype)
    : undefined;
  return {
    ...characterClass,
    name: `${characterClass.name} (${archetype.name})`,
    babProgression: archetype.babProgression ?? characterClass.babProgression,
    saves: {
      ...characterClass.saves,
      ...(archetype.saveProgressionOverrides ?? {}),
    },
    skillRanksPerLevel:
      archetype.skillRanksPerLevel ??
      (inferredSkillRanks?.operation === "replace"
        ? inferredSkillRanks.value
        : characterClass.skillRanksPerLevel + (inferredSkillRanks?.value ?? 0)),
    hitDie: archetype.hitDie ?? characterClass.hitDie,
    proficiencyAdjustments: [
      ...(characterClass.proficiencyAdjustments ?? []),
      ...(archetype.proficiencyAdjustments ?? inferredProficiencies),
    ],
    optionGroupAugmentations: [
      ...(characterClass.optionGroupAugmentations ?? []),
      ...(archetype.optionGroupAugmentations ?? []),
    ],
    spellListAdditions: {
      ...(characterClass.spellListAdditions ?? {}),
      ...(archetype.spellListAdditions ?? {}),
    },
    spellListClassId: archetype.spellListClassId ?? characterClass.spellListClassId,
    bonusSpellAdditions: {
      ...(characterClass.bonusSpellAdditions ?? {}),
      ...(archetype.bonusSpellAdditions ?? {}),
    },
    spellcasting: baseSpellcasting
      ? {
          ...baseSpellcasting,
          slotsByLevel: adjustTable(baseSpellcasting.slotsByLevel, archetype.spellSlotAdjustmentPerLevel),
          preparedByLevel: adjustTable(baseSpellcasting.preparedByLevel, preparedAdjustment),
          knownByLevel: adjustTable(baseSpellcasting.knownByLevel, archetype.spellsKnownAdjustmentPerLevel),
        }
      : undefined,
    spellSlotAdjustmentPerLevel: archetype.spellSlotAdjustmentPerLevel,
    preparedSpellAdjustmentPerLevel: archetype.preparedSpellAdjustmentPerLevel,
    spellsKnownAdjustmentPerLevel: archetype.spellsKnownAdjustmentPerLevel,
    companionGrants: [
      ...(characterClass.companionGrants ?? []),
      ...(archetype.companionGrants ?? []),
    ],
    companionProgressionAdjustments: [
      ...(characterClass.companionProgressionAdjustments ?? []),
      ...(archetype.companionProgressionAdjustments ?? []),
    ],
    wildShapeLevelAdjustment:
      archetype.wildShapeLevelAdjustment ??
      characterClass.wildShapeLevelAdjustment,
    druidDomainIds: archetype.druidDomainIds ?? characterClass.druidDomainIds,
    rangerCombatStyleIds:
      archetype.rangerCombatStyleIds ?? characterClass.rangerCombatStyleIds,
    mountedCompanionOnly:
      archetype.mountedCompanionOnly ?? characterClass.mountedCompanionOnly,
    classSkills: [
      ...new Set(
        characterClass.classSkills
          .filter(
            (skill) => ![...(archetype.classSkillRemovals ?? []), ...inferredClassSkills.removals].includes(skill),
          )
          .concat(archetype.classSkillAdditions ?? [], inferredClassSkills.additions),
      ),
    ],
    features: [...retained, ...replacements].sort(
      (left, right) =>
        left.level - right.level || left.name.localeCompare(right.name),
    ),
  };
}

const archetypeSkillPattern = /Knowledge \((?:all|arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)\)|Use Magic Device|Sleight of Hand|Sense Motive|Handle Animal|Disable Device|Escape Artist|Acrobatics|Appraise|Bluff|Climb|Craft(?: \([^)]+\))?|Diplomacy|Disguise|Fly|Heal|Intimidate|Linguistics|Perception|Perform(?: \([^)]+\))?|Profession(?: \([^)]+\))?|Ride|Spellcraft|Stealth|Survival|Swim/gi;

function namedArchetypeSkills(text) {
  return [...String(text).matchAll(archetypeSkillPattern)].map(match => {
    const skill = match[0].replace(/^(Craft|Perform|Profession) \([^)]+\)$/i, "$1");
    return skill.replace(/^Knowledge \(all\)$/i, "Knowledge");
  });
}

export function inferArchetypeClassSkillChanges(archetype) {
  const additions = new Set();
  const removals = new Set();
  const summaries = (archetype?.replacements ?? []).flatMap(item => item.features ?? []).map(feature =>
    String(feature.summary ?? "").replace(/doesn(?:'|’|â€™)t/gi, "does not"),
  );
  for (const sentence of summaries.flatMap(summary => summary.split(/(?<=[.!?])\s+/))) {
    if (sentence.length > 1200) continue;
    if (!/class skills?/i.test(sentence) || /(?:companion|eidolon|familiar|homunculus).*class skills?/i.test(sentence)) continue;
    const addPatterns = [
      /(?:adds?|gains?|has|receives?|treats?)\s+(.+?)\s+(?:to (?:his|her|their|the)?\s*(?:list of )?class skills?|as (?:a )?class skills?)/gi,
      /(.+?)\s+are (?:all )?class skills for/gi,
      /(.+?)\s+is a class skill for/gi,
    ];
    const removePatterns = [
      /(?:does not gain|do not gain|doesn't receive|does not receive|removes?|loses?|eliminate)\s+(.+?)(?:\s+(?:as|from).*?class skills|[.;]|$)/gi,
      /instead of\s+(.+?)(?:\s+as class skills?|[.;]|$)/gi,
      /replace(?:s)?\s+(.+?)\s+as class skills?/gi,
      /(.+?)\s+are not class skills/gi,
      /(?:as )?replacements? for\s+(.+?)(?:[.;]|$)/gi,
    ];
    for (const pattern of addPatterns) for (const match of sentence.matchAll(pattern)) for (const skill of namedArchetypeSkills(match[1])) additions.add(skill);
    for (const pattern of removePatterns) for (const match of sentence.matchAll(pattern)) for (const skill of namedArchetypeSkills(match[1])) removals.add(skill);
  }
  for (const skill of removals) additions.delete(skill);
  return { additions: [...additions], removals: [...removals] };
}

function namedArchetypeProficiencies(fragment) {
  const text = String(fragment)
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  const results = [];
  const add = (category, proficiency) => {
    if (!results.some(item => item.category === category && item.proficiency === proficiency))
      results.push({ category, proficiency });
  };
  if (/\b(?:all simple weapons?|simple weapons|simple and martial weapons)\b/i.test(text)) add("weapon", "All simple weapons");
  if (/\b(?:all martial weapons?|martial weapons|simple and martial weapons)\b/i.test(text)) add("weapon", "All martial weapons");
  if (/\bone martial weapon\b/i.test(text)) add("weapon", "One martial weapon (choice)");
  if (/\ball thrown weapons\b/i.test(text)) add("weapon", "All thrown weapons");
  if (/\ball monk weapons\b/i.test(text)) add("weapon", "All monk weapons");
  if (/\b(?:his|her|their|the) deity(?:'|’|â€™)s favored weapon\b/i.test(text)) add("weapon", "Deity's favored weapon");
  if (/\b(?:all )?firearms?\b/i.test(text)) add("weapon", "Firearms");
  for (const armor of ["light", "medium", "heavy", "leather", "hide"])
    if (new RegExp(`\\b${armor} armors?\\b`, "i").test(text)) add("armor", `${armor[0].toUpperCase()}${armor.slice(1)} armor`);
  for (const armor of ["light", "medium", "heavy"])
    if (new RegExp(`\\b${armor}(?:,| and| or)(?: light| medium| heavy)+ armor\\b`, "i").test(text)) add("armor", `${armor[0].toUpperCase()}${armor.slice(1)} armor`);
  if (/\b(?:any|all) (?:type(?:s)? of )?armors?\b/i.test(text)) add("armor", "All armor");
  if (/\btower shields?\b/i.test(text) && !/(?:except|but not|not with) tower shields?/i.test(text)) add("shield", "Tower shields");
  if (/\bbucklers?\b/i.test(text)) add("shield", "Bucklers");
  if (/\bshields?\b/i.test(text) && !/\b(?:bucklers?|light shields?|heavy shields?|tower shields?)\b/i.test(text))
    add("shield", "All shields");

  const residual = text
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(?:all )?simple and martial weapons?\b/gi, "")
    .replace(/\b(?:all )?(?:simple|martial) weapons?\b/gi, "")
    .replace(/\ball (?:thrown|monk) weapons\b/gi, "")
    .replace(/\b(?:all )?firearms?\b/gi, "")
    .replace(/\b(?:light|medium|heavy|leather|hide) armors?\b/gi, "")
    .replace(/\b(?:any|all) (?:type(?:s)? of )?armors?\b/gi, "")
    .replace(/\b(?:bucklers?|light shields?|heavy shields?|tower shields?|shields?)\b/gi, "");
  for (const raw of residual.split(/,|\band\b|\bplus\b/gi)) {
    const value = raw
      .replace(/^(?:with|the|a|an|one|any|in addition to|proficiency in|proficiency with)\s+/i, "")
      .replace(/\s+(?:as weapons?|as a weapon)$/i, "")
      .trim();
    if (!value || value.length > 45 || /^(?:or|with|only|all|it|its use|light|medium|heavy|one-handed|two-handed)$/i.test(value) || /\bor\b/i.test(value) || /\b(?:armors?|shields?|weapons?|proficien|normal|choos|class|feat|spell|bloodline)\b/i.test(value)) continue;
    if (/^[a-z][a-z' -]+$/i.test(value)) add("weapon", value.replace(/\b\w/g, letter => letter.toUpperCase()));
  }
  return results;
}

export function inferArchetypeProficiencyAdjustments(archetype) {
  const grouped = new Map();
  const record = (operation, fragment) => {
    const normalizedFragment = String(fragment).replace(/\(except ([^)]+)\)/gi, " but not $1");
    const exclusion = normalizedFragment.match(/^(.*?)(?:,?\s+(?:but not(?: with)?|except(?: for)?)\s+)(.+)$/i);
    const includedFragment = exclusion ? exclusion[1] : normalizedFragment;
    for (const { category, proficiency } of namedArchetypeProficiencies(includedFragment)) {
      const key = `${category}:${operation}`;
      if (!grouped.has(key)) grouped.set(key, new Set());
      grouped.get(key).add(proficiency);
    }
    if (exclusion) record(operation === "add" ? "remove" : "add", exclusion[2]);
  };
  const features = (archetype?.replacements ?? []).flatMap(item => item.features ?? []);
  for (const feature of features) {
    if (!/proficien/i.test(`${feature.name ?? ""} ${feature.summary ?? ""}`)) continue;
    if (/(?:companion|eidolon|familiar|homunculus|mount).*proficien/i.test(feature.summary ?? "") && !/proficien/i.test(feature.name ?? "")) continue;
    const text = String(feature.summary ?? "")
      .replace(/(?:isn|aren|doesn|don)(?:'|’|â€™|Ã¢â‚¬â„¢)t/gi, match => match.toLowerCase().startsWith("isn") ? "is not" : match.toLowerCase().startsWith("aren") ? "are not" : match.toLowerCase().startsWith("doesn") ? "does not" : "do not")
      .replace(/\s+/g, " ");
    if (/picks? one martial weapon[^.]{0,100}becomes? proficient/i.test(text))
      record("add", "one martial weapon");
    const negativePatterns = [
      /(?:is|are) not proficient (?:with|in) (.+?)(?:[.;]|$)/gi,
      /(?:does not|do not) gain (?:weapon |armor |shield )?proficiency (?:with|in) (.+?)(?:(?:,? and must)|[.;]|$)/gi,
      /loses? (?:his |her |their )?proficiency with (.+?)(?:[.;]|$)/gi,
      /loses? (.+?) proficiency(?=,? and|[.;]|$)/gi,
      /replaces? (?:his|her|their|the)?\s*proficiency with (.+?)(?:[.;]|$)/gi,
      /replaces? [^.]{0,100}?proficiency with (.+?)(?:[.;]|$)/gi,
    ];
    const positivePatterns = [
      /(?:is|are) proficient (?:with|in) (.+?)(?:[.;]|$)/gi,
      /gains? (?:weapon |armor |shield )?proficiency (?:with|in) (.+?)(?:[.;]|$)/gi,
      /gains? (.+?) proficiency(?=,? and|[.;]|$)/gi,
      /becomes? proficient (?:with|in)(?: the use of)? (.+?)(?:[.;]|$)/gi,
      /treats? (.+?) as (?:a )?simple weapon/gi,
    ];
    for (const pattern of negativePatterns) for (const match of text.matchAll(pattern)) record("remove", match[1]);
    for (const pattern of positivePatterns) for (const match of text.matchAll(pattern)) {
      if (/(?:does not|do not|is not|are not)\s*$/i.test(text.slice(Math.max(0, match.index - 16), match.index))) continue;
      record("add", match[1]);
    }
  }
  return [...grouped.entries()].map(([key, proficiencies]) => {
    const [category, operation] = key.split(":");
    return { category, operation, proficiencies: [...proficiencies] };
  });
}

export function inferArchetypeSkillRankAdjustment(archetype) {
  const features = (archetype?.replacements ?? []).flatMap(item => item.features ?? []);
  for (const feature of features) {
    const text = `${feature.name ?? ""} ${feature.summary ?? ""}`.replace(/\s+/g, " ");
    if (/(?:companion|eidolon|familiar|homunculus|phantom|mount).*skill ranks?/i.test(text)) continue;
    const fixed = text.match(/Skill Ranks per Level\s*:?\s*(\d+)\s*\+\s*(?:Int|Intelligence)\s+modifier/i);
    if (fixed) {
      const value = Number(fixed[1]);
      if (value >= 1 && value <= 12) return { operation: "replace", value };
    }
    const additive = text.match(/(?:gains?|receives?)\s+(\d+)\s+(?:additional|bonus) skill ranks?\s+(?:at each|each|per) level/i);
    if (additive) {
      const value = Number(additive[1]);
      if (value >= 1 && value <= 6) return { operation: "add", value };
    }
  }
  return undefined;
}

function archetypeReplacementKeys(archetype) {
  return new Set(
    archetype?.replacements
      ?.flatMap((replacement) => [
        ...(replacement.featureIds ?? []).map((id) => `feature:${id}`),
        ...(replacement.progressionKeys ?? []).map(
          (key) => `progression:${key}`,
        ),
      ])
      .filter((key) => !key.startsWith("feature:nested-")) ?? [],
  );
}

export function archetypeConflictReasons(left, right) {
  if (!left || !right) return [];
  if (left.classId !== right.classId)
    return ["Archetypes belong to different classes."];
  const leftKeys = archetypeReplacementKeys(left);
  const conflicts = [...archetypeReplacementKeys(right)].filter((key) =>
    leftKeys.has(key),
  );
  const nested = (left.nestedReplacements ?? []).filter((replacement) =>
    (right.nestedReplacements ?? []).some(
      (candidate) => candidate.toLowerCase() === replacement.toLowerCase(),
    ),
  );
  return [
    ...conflicts.map(
      (key) =>
        `Both replace ${key.replace(/^(feature|progression):/, "").replace(/-/g, " ")}.`,
    ),
    ...nested.map((replacement) => `Both replace ${replacement}.`),
  ];
}

export function compatibleArchetypes(selected, candidate) {
  return !selected.some(
    (archetype) => archetypeConflictReasons(archetype, candidate).length > 0,
  );
}

export function archetypeEligibilityIssues(archetype, context = {}) {
  if (!archetype) return ["Archetype is unavailable."];
  const issues = [...(archetype.manualRequirements ?? [])];
  for (const requirement of archetype.requirements ?? []) {
    if (prerequisiteMet(requirement, context)) continue;
    if (requirement.type === "ancestry")
      issues.push(`Requires ${requirement.id.replace(/-/g, " ")} ancestry.`);
    else if (
      requirement.type === "any" &&
      requirement.prerequisites.every((item) => item.type === "ancestry")
    ) {
      issues.push(
        `Requires ${requirement.prerequisites.map((item) => item.id.replace(/-/g, " ")).join(" or ")} ancestry.`,
      );
    } else issues.push("Has an unmet requirement.");
  }
  return [...new Set(issues)];
}

export function applyArchetypes(characterClass, archetypes = []) {
  const selected = archetypes.filter(
    (archetype) => archetype?.classId === characterClass.id,
  );
  for (let index = 0; index < selected.length; index += 1) {
    for (let other = index + 1; other < selected.length; other += 1) {
      const conflicts = archetypeConflictReasons(
        selected[index],
        selected[other],
      );
      if (conflicts.length)
        throw new Error(
          `${selected[index].name} conflicts with ${selected[other].name}: ${conflicts.join(" ")}`,
        );
    }
  }
  const applied = selected.reduce(
    (current, archetype) => applyArchetype(current, archetype),
    characterClass,
  );
  return selected.length
    ? {
        ...applied,
        name: `${characterClass.name} (${selected.map((archetype) => archetype.name).join(" + ")})`,
      }
    : applied;
}

export function archetypeAutomationSummary(archetype, feats = []) {
  if (!archetype) return { automated: [], manual: [] };
  const automated = [];
  if ((archetype.replacements ?? []).some(item => item.featureIds?.length || item.progressionKeys?.length))
    automated.push("Base feature replacements and level progression");
  if (archetype.featureOverrides?.length) automated.push("Feature rules overrides");
  if (archetype.spellListAdditions && Object.keys(archetype.spellListAdditions).length) automated.push("Spell-list additions");
  if (archetype.bonusSpellAdditions && Object.keys(archetype.bonusSpellAdditions).length) automated.push("Bonus spells known");
  if ([archetype.spellSlotAdjustmentPerLevel, archetype.preparedSpellAdjustmentPerLevel, archetype.spellsKnownAdjustmentPerLevel].some((value) => value !== undefined)) automated.push("Spell-slot and spells-known adjustments");
  if (archetype.companionGrants?.length) automated.push("Companion grants and effective-level progression");
  if (archetype.companionProgressionAdjustments?.length) automated.push("Companion effective-level adjustments");
  if (archetype.removesSpellcasting) automated.push("Spellcasting removal");
  if (archetype.wildShapeLevelAdjustment) automated.push("Wild shape effective level");
  if (archetype.druidDomainIds?.length) automated.push("Available druid domains");
  if (archetype.rangerCombatStyleIds?.length) automated.push("Available ranger combat styles");
  if (archetype.mountedCompanionOnly) automated.push("Mounted companion restriction");
  const inferredClassSkills = inferArchetypeClassSkillChanges(archetype);
  if (archetype.classSkillAdditions?.length || archetype.classSkillRemovals?.length || inferredClassSkills.additions.length || inferredClassSkills.removals.length) automated.push("Class skill changes");
  if ([archetype.babProgression, archetype.saveProgressionOverrides, archetype.skillRanksPerLevel, archetype.hitDie].some(value => value !== undefined)) automated.push("Class combat-statistic progression");
  const proficiencyAdjustments = archetype.proficiencyAdjustments?.length
    ? archetype.proficiencyAdjustments
    : inferArchetypeProficiencyAdjustments(archetype);
  for (const adjustment of proficiencyAdjustments) {
    const action = adjustment.operation === "add" ? "gain" : adjustment.operation === "remove" ? "lose" : "use only";
    automated.push(`${adjustment.category[0].toUpperCase()}${adjustment.category.slice(1)} proficiencies: ${action} ${adjustment.proficiencies.join(", ")}`);
  }
  const inferredSkillRanks = archetype.skillRanksPerLevel === undefined
    ? inferArchetypeSkillRankAdjustment(archetype)
    : undefined;
  if (archetype.skillRanksPerLevel !== undefined)
    automated.push(`Class skill-rank progression: ${archetype.skillRanksPerLevel} + Intelligence per level`);
  else if (inferredSkillRanks)
    automated.push(`Class skill-rank progression: ${inferredSkillRanks.operation === "add" ? "+" : ""}${inferredSkillRanks.value} per level${inferredSkillRanks.operation === "replace" ? " + Intelligence" : ""}`);
  const resourceAdjustments = archetype.resourceAdjustments?.length
    ? archetype.resourceAdjustments
    : inferArchetypeResourceAdjustments(archetype);
  if (resourceAdjustments.length) automated.push(`${resourceAdjustments.length} tracked class resource adjustment${resourceAdjustments.length === 1 ? "" : "s"}`);
  if (archetype.conditionalModifiers?.length)
    automated.push(`${archetype.conditionalModifiers.length} level-aware conditional modifier${archetype.conditionalModifiers.length === 1 ? "" : "s"}`);
  if (archetype.skillBonusAdjustments?.length)
    automated.push(`${archetype.skillBonusAdjustments.length} level-aware skill bonus${archetype.skillBonusAdjustments.length === 1 ? "" : "es"}`);
  if (archetype.landSpeedAdjustments?.length)
    automated.push(`${archetype.landSpeedAdjustments.length} equipment-aware land-speed adjustment${archetype.landSpeedAdjustments.length === 1 ? "" : "s"}`);
  if (archetype.requirements?.length) automated.push("Builder-supported eligibility requirements");
  if (archetype.optionGroupAugmentations?.length)
    automated.push(`${archetype.optionGroupAugmentations.length} archetype-specific option-group augmentation${archetype.optionGroupAugmentations.length === 1 ? "" : "s"}`);
  const replacementFeatures = (archetype.replacements ?? []).flatMap(item => item.features ?? []);
  const inferredFeatGrants = inferArchetypeGrantedFeats(archetype, feats);
  if (inferredFeatGrants.length) automated.push(`${inferredFeatGrants.length} level-aware bonus feat grant${inferredFeatGrants.length === 1 ? "" : "s"}`);
  const inferredFeatFeatureIds = new Set(inferredFeatGrants.map(grant => grant.featureId));
  const inferredFeatChoices = inferArchetypeFeatChoices(archetype, feats);
  if (inferredFeatChoices.length) automated.push(`${inferredFeatChoices.length} restricted bonus feat choice${inferredFeatChoices.length === 1 ? "" : "s"}`);
  const inferredFeatAlternatives = inferArchetypeFeatAlternatives(archetype, feats);
  if (inferredFeatAlternatives.length) automated.push(`${inferredFeatAlternatives.length} class-choice feat alternative${inferredFeatAlternatives.length === 1 ? "" : "s"}`);
  const inferredFeatChoiceFeatureIds = new Set(inferredFeatChoices.map(choice => choice.sourceFeatureId));
  const configured = replacementFeatures.filter(feature => feature.choiceRequired && feature.optionGroupId);
  if (configured.length) automated.push(`${configured.length} selectable feature choice${configured.length === 1 ? "" : "s"}`);
  const resourceActions = replacementFeatures.flatMap(feature => feature.resourceActions ?? []);
  if (resourceActions.length) automated.push(`${resourceActions.length} resource-powered feature action${resourceActions.length === 1 ? "" : "s"}`);
  const spellAutomations = replacementFeatures.filter(feature => feature.spellAutomation);
  if (spellAutomations.length) automated.push(`${spellAutomations.length} spell-powered archetype action${spellAutomations.length === 1 ? "" : "s"}`);
  const adjustmentFeatureIds = new Set([
    ...(archetype.conditionalModifiers ?? []).map(adjustment => adjustment.sourceFeatureId),
    ...(archetype.skillBonusAdjustments ?? []).map(adjustment => adjustment.sourceFeatureId),
    ...(archetype.landSpeedAdjustments ?? []).map(adjustment => adjustment.sourceFeatureId),
  ].filter(Boolean));
  const manualFeatures = replacementFeatures
    .filter(feature => !feature.optionGroupId && !feature.grantedFeatId && !feature.grantedFeatIds?.length && !feature.spellAutomation && !inferredFeatFeatureIds.has(feature.id) && !inferredFeatChoiceFeatureIds.has(feature.id) && !adjustmentFeatureIds.has(feature.id))
    .map(feature => `${feature.name} (level ${feature.level})`);
  const manual = archetype.mechanicalCoverage === "full"
    ? []
    : [...new Set([...(archetype.manualRequirements ?? []), ...manualFeatures])];
  return { automated: [...new Set(automated)], manual };
}

export function normalizeSelectedTraits(
  selectedTraitIds,
  traits,
  slotCount = 2,
) {
  if (
    !Array.isArray(selectedTraitIds) ||
    !Number.isInteger(slotCount) ||
    slotCount < 0
  )
    return [];
  const byId = new Map(traits.map((trait) => [trait.id, trait]));
  const categories = new Set();
  const selected = [];
  for (const id of selectedTraitIds) {
    const trait = typeof id === "string" ? byId.get(id) : null;
    if (
      !trait ||
      selected.includes(id) ||
      categories.has(trait.category) ||
      selected.length >= slotCount
    )
      continue;
    selected.push(id);
    categories.add(trait.category);
  }
  return selected;
}

export function normalizeSelectedAlternateRacialTraits(
  selectedIds,
  alternateTraits = [],
) {
  const byId = new Map(alternateTraits.map((trait) => [trait.id, trait]));
  const replaced = new Set();
  const normalized = [];
  for (const id of Array.isArray(selectedIds) ? selectedIds : []) {
    const trait = byId.get(id);
    if (
      !trait ||
      normalized.includes(id) ||
      !Array.isArray(trait.replaces) ||
      trait.replaces.some((replacedId) => replaced.has(replacedId))
    )
      continue;
    normalized.push(id);
    trait.replaces.forEach((replacedId) => replaced.add(replacedId));
  }
  return normalized;
}

export function normalizeSelectedTraitChoices(
  selectedTraitChoices,
  selectedTraitIds,
  traits,
  { spells = [], classes = [], classId } = {},
) {
  if (
    !selectedTraitChoices ||
    typeof selectedTraitChoices !== "object" ||
    Array.isArray(selectedTraitChoices)
  )
    return {};
  const selected = new Set(normalizeSelectedTraits(selectedTraitIds, traits));
  const byId = new Map(traits.map((trait) => [trait.id, trait]));
  return Object.fromEntries(
    Object.entries(selectedTraitChoices).filter(([traitId, choice]) => {
      const traitChoice = byId.get(traitId)?.choice;
      const validChoice =
        traitChoice?.key === "classSkill"
          ? traitChoice.options.includes(choice)
          : (traitChoice?.key === "spell" &&
              spells.some(
                (spell) =>
                  spell.id === choice &&
                  (!classId || spell.levelByClass?.[classId] !== undefined) &&
                  (traitChoice.maximumSpellLevel === undefined ||
                    Math.min(...Object.values(spell.levelByClass ?? {})) <=
                      traitChoice.maximumSpellLevel),
              )) ||
            (traitChoice?.key === "class" &&
              classes.some((characterClass) => characterClass.id === choice));
      return selected.has(traitId) && typeof choice === "string" && validChoice;
    }),
  );
}

export function traitBonuses(
  selectedTraitIds,
  traits,
  selectedTraitChoices = {},
  sources = {},
) {
  const selected = normalizeSelectedTraits(selectedTraitIds, traits);
  const choices = normalizeSelectedTraitChoices(
    selectedTraitChoices,
    selected,
    traits,
    sources,
  );
  const result = {
    initiative: 0,
    saves: { fortitude: 0, reflex: 0, will: 0 },
    skillBonuses: {},
    classSkills: [],
  };
  for (const id of selected) {
    const trait = traits.find((trait) => trait.id === id);
    const effects = trait?.effects ?? {};
    result.initiative += effects.initiative ?? 0;
    for (const save of Object.keys(result.saves))
      result.saves[save] += effects.saves?.[save] ?? 0;
    for (const [skill, bonus] of Object.entries(effects.skillBonuses ?? {}))
      result.skillBonuses[skill] = (result.skillBonuses[skill] ?? 0) + bonus;
    for (const skill of effects.classSkills ?? [])
      if (!result.classSkills.includes(skill)) result.classSkills.push(skill);
    for (const modifier of effects.conditionalModifiers ?? []) {
      result.conditionalModifiers ??= [];
      result.conditionalModifiers.push({ ...modifier, source: trait.name });
    }
    const choice = choices[id];
    if (
      choice &&
      trait?.choice?.key === "classSkill" &&
      !result.classSkills.includes(choice)
    )
      result.classSkills.push(choice);
    if (choice && trait?.choice?.key === "spell" && effects.chosenSpell) {
      result.spellBonuses ??= {};
      const current = result.spellBonuses[choice] ?? {
        casterLevel: 0,
        metamagicLevelAdjustment: 0,
      };
      result.spellBonuses[choice] = {
        casterLevel:
          current.casterLevel + (effects.chosenSpell.casterLevel ?? 0),
        metamagicLevelAdjustment:
          current.metamagicLevelAdjustment +
          (effects.chosenSpell.metamagicLevelAdjustment ?? 0),
      };
      if (effects.chosenSpell.spellLikeAbilityUses) {
        result.conditionalModifiers ??= [];
        result.conditionalModifiers.push({
          label: `${effects.chosenSpell.spellLikeAbilityUses}/day spell-like ability`,
          condition: `cast ${sources.spells?.find((spell) => spell.id === choice)?.name ?? choice} as a spell-like ability`,
          source: trait.name,
        });
      }
    }
  }
  return result;
}

export function featBonuses(
  selectedFeatIds,
  feats,
  selectedFeatChoices = {},
  { level = 1, skillRanks = {} } = {},
) {
  const selected = new Set(
    Array.isArray(selectedFeatIds) ? selectedFeatIds : [],
  );
  const result = {
    initiative: 0,
    saves: { fortitude: 0, reflex: 0, will: 0 },
    armorClass: { normal: 0, touch: 0, flatFooted: 0 },
    hitPoints: 0,
    skillBonuses: {},
    weaponBonuses: {},
    sources: [],
  };
  const addSource = (source, target, bonus, choice) => {
    if (bonus)
      result.sources.push({
        source,
        target,
        bonus,
        ...(choice ? { choice } : {}),
      });
  };
  for (const feat of feats) {
    if (!selected.has(feat.id)) continue;
    const effects = feat.effects ?? {};
    result.initiative += effects.initiative ?? 0;
    addSource(feat.name, "Initiative", effects.initiative ?? 0);
    for (const save of Object.keys(result.saves)) {
      const bonus = effects.saves?.[save] ?? 0;
      result.saves[save] += bonus;
      addSource(
        feat.name,
        `${save[0].toUpperCase()}${save.slice(1)} save`,
        bonus,
      );
    }
    for (const armorClass of Object.keys(result.armorClass)) {
      const bonus = effects.armorClass?.[armorClass] ?? 0;
      result.armorClass[armorClass] += bonus;
      addSource(
        feat.name,
        armorClass === "normal"
          ? "AC"
          : armorClass === "touch"
            ? "Touch AC"
            : "Flat-footed AC",
        bonus,
      );
    }
    if (effects.hitPoints) {
      const bonus = Math.max(
        effects.hitPoints.minimum,
        level * effects.hitPoints.perLevel,
      );
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
      const bonus =
        effects.chosenSkill.rankThreshold &&
        ranks >= effects.chosenSkill.rankThreshold.minimum
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
      result.weaponBonuses[key] = {
        attack: current.attack + attack,
        damage: current.damage + damage,
      };
      addSource(feat.name, "Weapon attacks", attack, choice);
      addSource(feat.name, "Weapon damage", damage, choice);
    }
  }
  return result;
}

export function featSlotsAtLevel(level, { bonusFeats = 0 } = {}) {
  assertLevel(level);
  if (!Number.isInteger(bonusFeats) || bonusFeats < 0)
    throw new RangeError("Bonus feats must be a non-negative integer.");
  return 1 + Math.floor((level - 1) / 2) + bonusFeats;
}

export function skillRanksThroughLevel(
  characterClass,
  level,
  intelligenceScore,
  { racialBonusPerLevel = 0 } = {},
) {
  assertLevel(level);
  if (!Number.isInteger(racialBonusPerLevel) || racialBonusPerLevel < 0)
    throw new RangeError("Racial skill bonus must be a non-negative integer.");
  const ranksPerLevel =
    Math.max(
      1,
      characterClass.skillRanksPerLevel + abilityModifier(intelligenceScore),
    ) + racialBonusPerLevel;
  return ranksPerLevel * level;
}

export function skillTotal(characterClass, skill, abilityScore, ranks) {
  if (!Number.isInteger(ranks) || ranks < 0)
    throw new RangeError("Skill ranks must be a non-negative integer.");
  const group = skill.name.split(" (")[0];
  const isClassSkill =
    characterClass.classSkills.includes(skill.name) ||
    characterClass.classSkills.includes(group);
  return {
    total:
      ranks +
      abilityModifier(abilityScore) +
      (isClassSkill && ranks > 0 ? 3 : 0),
    isClassSkill,
  };
}

export function skillRankBudget(totalRanks, allocations) {
  if (!Number.isInteger(totalRanks) || totalRanks < 0)
    throw new RangeError("Total skill ranks must be a non-negative integer.");
  const allocated = Object.values(allocations).reduce(
    (total, ranks) =>
      total + (Number.isInteger(ranks) && ranks > 0 ? ranks : 0),
    0,
  );
  return {
    allocated,
    remaining: Math.max(0, totalRanks - allocated),
    overspent: Math.max(0, allocated - totalRanks),
  };
}

export function normalizeSkillRanks(
  allocations,
  totalRanks,
  maximumRanksPerSkill,
) {
  if (!Number.isInteger(totalRanks) || totalRanks < 0)
    throw new RangeError("Total skill ranks must be a non-negative integer.");
  if (!Number.isInteger(maximumRanksPerSkill) || maximumRanksPerSkill < 0)
    throw new RangeError(
      "Maximum ranks per skill must be a non-negative integer.",
    );
  if (
    !allocations ||
    typeof allocations !== "object" ||
    Array.isArray(allocations)
  )
    return {};
  let remaining = totalRanks;
  return Object.fromEntries(
    Object.entries(allocations).flatMap(([name, ranks]) => {
      if (
        typeof name !== "string" ||
        !Number.isInteger(ranks) ||
        ranks <= 0 ||
        remaining <= 0
      )
        return [];
      const normalized = Math.min(ranks, maximumRanksPerSkill, remaining);
      remaining -= normalized;
      return normalized > 0 ? [[name, normalized]] : [];
    }),
  );
}

export function classProgression(
  characterClass,
  level,
  { intelligenceScore = 10, racialSkillBonusPerLevel = 0, bonusFeats = 0 } = {},
) {
  assertClassLevel(characterClass, level);
  return {
    level,
    baseAttackBonus: classBaseAttackBonus(characterClass, level),
    saves: Object.fromEntries(
      Object.keys(characterClass.saves).map((save) => [
        save,
        classSavingThrow(characterClass, save, level),
      ]),
    ),
    skillRanks: skillRanksThroughLevel(
      characterClass,
      level,
      intelligenceScore,
      { racialBonusPerLevel: racialSkillBonusPerLevel },
    ),
    featSlots: featSlotsAtLevel(level, { bonusFeats }),
    features: featuresThroughLevel(characterClass, level),
  };
}

export function multiclassProgression(
  classes,
  classLevels,
  { intelligenceScore = 10, racialSkillBonusPerLevel = 0, bonusFeats = 0 } = {},
) {
  if (
    !Array.isArray(classes) ||
    !Array.isArray(classLevels) ||
    classLevels.length === 0
  ) {
    throw new RangeError("At least one class level is required.");
  }
  if (
    !Number.isInteger(racialSkillBonusPerLevel) ||
    racialSkillBonusPerLevel < 0
  ) {
    throw new RangeError("Racial skill bonus must be a non-negative integer.");
  }
  const classesById = new Map(
    classes.map((characterClass) => [characterClass.id, characterClass]),
  );
  const seenClassIds = new Set();
  const resolved = classLevels.map((entry) => {
    if (
      !entry ||
      typeof entry.classId !== "string" ||
      !Number.isInteger(entry.level) ||
      entry.level < 1 ||
      entry.level > 20
    ) {
      throw new RangeError(
        "Each multiclass entry must have a valid class id and 1-20 levels.",
      );
    }
    if (seenClassIds.has(entry.classId))
      throw new RangeError("Each class may appear only once.");
    seenClassIds.add(entry.classId);
    const characterClass = classesById.get(entry.classId);
    if (!characterClass)
      throw new RangeError(`Unknown class: ${entry.classId}`);
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
    for (const save of Object.keys(saves))
      saves[save] += classSavingThrow(characterClass, save, classLevel);
    skillRanks += skillRanksThroughLevel(
      characterClass,
      classLevel,
      intelligenceScore,
      {
        racialBonusPerLevel: racialSkillBonusPerLevel,
      },
    );
    features.push(
      ...featuresThroughLevel(characterClass, classLevel).map((feature) => ({
        ...feature,
        classId: characterClass.id,
        className: characterClass.name,
        classLevel,
      })),
    );
  }
  return {
    level,
    classLevels: resolved.map(({ characterClass, level: classLevel }) => ({
      classId: characterClass.id,
      className: characterClass.name,
      level: classLevel,
    })),
    baseAttackBonus: baseAttackBonusTotal,
    saves,
    skillRanks,
    featSlots: featSlotsAtLevel(level, { bonusFeats }),
    features,
  };
}

export function featuresAtLevel(characterClass, level) {
  assertLevel(level);
  return characterClass.features.filter((feature) => feature.level === level);
}

export function featuresThroughLevel(characterClass, level) {
  assertLevel(level);
  return characterClass.features
    .filter((feature) => feature.level <= level)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function availableOptions(
  group,
  classId,
  classLevel,
  selectedIds = [],
  context = {},
) {
  assertLevel(classLevel);
  return group.options.filter(
    (option) =>
      option.classIds.includes(classId) &&
      option.minimumLevel <= classLevel &&
      prerequisitesMet(option.prerequisites, {
        classId,
        classLevel,
        selectedIds,
        ...context,
      }),
  );
}

export function featPrerequisiteResults(feat, context) {
  return feat.prerequisites.map((prerequisite) => ({
    prerequisite,
    met: prerequisiteMet(prerequisite, context),
  }));
}

export function normalizeSelectedFeats(
  selectedFeatIds,
  feats,
  context,
  slotCount,
  slotLevels = [],
  repeatableFeatIds = [],
) {
  if (
    !Array.isArray(selectedFeatIds) ||
    !Number.isInteger(slotCount) ||
    slotCount < 0
  )
    return [];
  const byId = new Map(feats.map((feat) => [feat.id, feat]));
  const repeatable = new Set([
    ...repeatableFeatIds,
    ...feats.filter((feat) => feat.repeatable).map((feat) => feat.id),
  ]);
  let result = selectedFeatIds
    .filter(
      (id, index, ids) =>
        typeof id === "string" &&
        (repeatable.has(id) || ids.indexOf(id) === index) &&
        byId.has(id),
    )
    .slice(0, slotCount);
  let changed = true;
  while (changed) {
    changed = false;
    const next = result.filter((id, index) => {
      const feat = byId.get(id);
      const eligible = prerequisitesMet(feat.prerequisites, {
        ...context,
        acquisitionLevel: slotLevels[index],
        candidateId: id,
        selectedIds: result.filter((otherId) => otherId !== id),
      });
      if (!eligible) changed = true;
      return eligible;
    });
    result = next;
  }
  return result;
}

export function normalizeSelectedFeatChoices(
  selectedFeatChoices,
  selectedFeatIds,
  feats,
) {
  if (
    !selectedFeatChoices ||
    typeof selectedFeatChoices !== "object" ||
    Array.isArray(selectedFeatChoices)
  )
    return {};
  const byId = new Map(feats.map((feat) => [feat.id, feat]));
  return Object.fromEntries(
    Object.entries(selectedFeatChoices).flatMap(([featId, choice]) => {
      const feat = byId.get(featId);
      const options = feat?.choice?.options;
      const validChoice =
        typeof choice === "string" &&
        (feat?.choice?.allowCustom
          ? choice.trim().length > 0 && choice.trim().length <= 80
          : Array.isArray(options) &&
            options.some((option) => option.id === choice));
      return selectedFeatIds.includes(featId) && validChoice
        ? [[featId, feat?.choice?.allowCustom ? choice.trim() : choice]]
        : [];
    }),
  );
}

export function prerequisitesMet(prerequisites, context) {
  return prerequisites.every((prerequisite) =>
    prerequisiteMet(prerequisite, context),
  );
}

function prerequisiteMet(prerequisite, context) {
  if (prerequisite.type === "level") {
    const level = context.classLevel;
    const ceilingLevel = context.acquisitionLevel ?? level;
    return (
      Number.isInteger(level) &&
      (prerequisite.minimum === undefined || level >= prerequisite.minimum) &&
      (prerequisite.maximum === undefined ||
        ceilingLevel <= prerequisite.maximum)
    );
  }
  if (prerequisite.type === "class-level")
    return (
      (context.classLevels?.[prerequisite.classId] ??
        (context.classId === prerequisite.classId ? context.classLevel : 0)) >=
      prerequisite.minimum
    );
  if (prerequisite.type === "ancestry")
    return context.ancestryId === prerequisite.id;
  if (prerequisite.type === "size") {
    const sizes = [
      "fine",
      "diminutive",
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan",
      "colossal",
    ];
    const size = sizes.indexOf(context.size);
    const minimum = prerequisite.minimum
      ? sizes.indexOf(prerequisite.minimum)
      : 0;
    const maximum = prerequisite.maximum
      ? sizes.indexOf(prerequisite.maximum)
      : sizes.length - 1;
    return (
      size !== -1 &&
      minimum !== -1 &&
      maximum !== -1 &&
      size >= minimum &&
      size <= maximum
    );
  }
  if (prerequisite.type === "caster-level")
    return context.casterLevel >= prerequisite.minimum;
  if (prerequisite.type === "spell-level") {
    const levels = prerequisite.castingType
      ? [context.spellLevels?.[prerequisite.castingType]]
      : Object.values(context.spellLevels ?? {});
    return levels.some((level) => level >= prerequisite.minimum);
  }
  if (prerequisite.type === "ability")
    return context.abilities?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "bab")
    return context.baseAttackBonus >= prerequisite.minimum;
  if (prerequisite.type === "save")
    return context.saves?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "skill")
    return context.skillRanks?.[prerequisite.key] >= prerequisite.minimum;
  if (prerequisite.type === "feature")
    return context.featureIds?.includes(prerequisite.id);
  if (prerequisite.type === "spell-access")
    return context.spellIds?.includes(prerequisite.id);
  if (prerequisite.type === "rule") return false;
  if (prerequisite.type === "feat")
    return context.selectedIds?.includes(prerequisite.id);
  if (prerequisite.type === "matching-choice") {
    const candidateChoice = context.selectedFeatChoices?.[context.candidateId];
    const prerequisiteChoice =
      context.selectedFeatChoices?.[prerequisite.featId];
    return (
      candidateChoice === undefined ||
      (prerequisiteChoice !== undefined &&
        candidateChoice === prerequisiteChoice)
    );
  }
  if (prerequisite.type === "choice-value")
    return (
      context.selectedFeatChoices?.[prerequisite.featId]
        ?.trim()
        .toLocaleLowerCase() === prerequisite.value.trim().toLocaleLowerCase()
    );
  if (prerequisite.type === "any")
    return prerequisite.prerequisites.some((alternative) =>
      prerequisiteMet(alternative, context),
    );
  return true;
}

function assertLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20)
    throw new RangeError("Level must be an integer from 1 to 20.");
}

function isRankRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          ([name, ranks]) =>
            typeof name === "string" && Number.isInteger(ranks) && ranks >= 0,
        ),
      )
    : {};
}
function isStringRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          ([name, id]) => typeof name === "string" && typeof id === "string",
        ),
      )
    : {};
}
function isStringArrayRecord(value, validKeys) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).flatMap(([key, entries]) =>
          validKeys.has(key) && Array.isArray(entries)
            ? [[key, entries.filter((entry) => typeof entry === "string")]]
            : [],
        ),
      )
    : {};
}
function isNestedRankRecord(value, validKeys) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).flatMap(([key, entries]) =>
          validKeys.has(key) ? [[key, isRankRecord(entries)]] : [],
        ),
      )
    : {};
}
