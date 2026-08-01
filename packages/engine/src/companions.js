const companionLevel = (level) =>
  Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));

const animalHitDice = [2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15,15,16];
const animalNaturalArmor = [0,2,2,2,4,4,4,6,6,6,8,8,8,10,10,10,12,12,12,12];
const animalAbilityBonus = [0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,6];
const animalBonusTricks = [1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,7];

export function animalCompanionProgression(level) {
  const effectiveLevel = companionLevel(level);
  const hitDice = animalHitDice[effectiveLevel - 1];
  return {
    effectiveLevel,
    hitDice,
    baseAttackBonus: Math.floor(hitDice * 0.75),
    saves: {
      fortitude: 2 + Math.floor(hitDice / 2),
      reflex: 2 + Math.floor(hitDice / 2),
      will: Math.floor(hitDice / 3),
    },
    skillRanks: hitDice,
    feats: 1 + Math.floor(hitDice / 3),
    naturalArmorBonus: animalNaturalArmor[effectiveLevel - 1],
    strengthDexterityBonus: animalAbilityBonus[effectiveLevel - 1],
    bonusTricks: animalBonusTricks[effectiveLevel - 1],
    specialAbilities: [
      "Link",
      "Share spells",
      ...(effectiveLevel >= 3 ? ["Evasion"] : []),
      ...(effectiveLevel >= 6 ? ["Devotion"] : []),
      ...(effectiveLevel >= 9 ? ["Multiattack"] : []),
      ...(effectiveLevel >= 15 ? ["Improved evasion"] : []),
    ],
  };
}

export function familiarProgression(level, masterHitPoints = 0) {
  const effectiveLevel = companionLevel(level);
  return {
    effectiveLevel,
    hitPoints: Math.max(0, Math.floor(Number(masterHitPoints) / 2) || 0),
    naturalArmorAdjustment: Math.ceil(effectiveLevel / 2),
    intelligence: 5 + Math.ceil(effectiveLevel / 2),
    specialAbilities: [
      "Alertness",
      "Improved evasion",
      "Share spells",
      "Empathic link",
      ...(effectiveLevel >= 3 ? ["Deliver touch spells"] : []),
      ...(effectiveLevel >= 5 ? ["Speak with master"] : []),
      ...(effectiveLevel >= 7 ? ["Speak with animals of its kind"] : []),
      ...(effectiveLevel >= 11 ? [`Spell resistance ${effectiveLevel + 5}`] : []),
      ...(effectiveLevel >= 13 ? ["Scry on familiar"] : []),
    ],
  };
}

export function normalizeCompanionState(value) {
  if (!value || typeof value !== "object") return {};
  const result = {};
  for (const [key, companion] of Object.entries(value)) {
    if (!key || !companion || typeof companion !== "object") continue;
    const kind = ["animal", "mount", "familiar", "eidolon", "drake"].includes(companion.kind)
      ? companion.kind
      : null;
    if (!kind) continue;
    result[key] = {
      kind,
      optionId: typeof companion.optionId === "string" ? companion.optionId.slice(0, 120) : "",
      name: typeof companion.name === "string" ? companion.name.trim().slice(0, 120) : "",
      currentHitPoints: Number.isInteger(companion.currentHitPoints) && companion.currentHitPoints >= 0
        ? Math.min(9999, companion.currentHitPoints)
        : null,
      skillRanks: Object.fromEntries(Object.entries(companion.skillRanks ?? {}).filter(([skill, rank]) => skill && Number.isInteger(rank) && rank >= 0 && rank <= 99)),
      featIds: [...new Set(Array.isArray(companion.featIds) ? companion.featIds.filter(id => typeof id === "string").slice(0, 20) : [])],
    };
  }
  return result;
}
