const clampLevel = (level) => Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));
const hitDice = [1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15,15];
const saves = [2,3,3,3,4,4,5,5,5,6,6,6,7,7,8,8,8,9,9,9];
const skillRanks = [3,6,9,12,15,18,21,24,27,30,34,36,39,42,45,48,51,54,57,60];
const feats = [1,1,2,2,2,3,3,3,4,4,5,5,5,6,6,6,7,7,8,8];

export function drakeCompanionProgression(level, schedule = {}) {
  const effectiveLevel = clampLevel(level);
  const index = effectiveLevel - 1;
  const naturalArmorIncreases = Math.floor(effectiveLevel / 3);
  const powerLevels = schedule.powerLevels ?? [3, 7, 11, 15, 19];
  const sizeLevels = schedule.sizeLevels ?? [5, 9, 13, 17];
  const sizeIncreases = sizeLevels.filter((unlockLevel) => effectiveLevel >= unlockLevel).length;
  const drakePowers = powerLevels.filter((unlockLevel) => effectiveLevel >= unlockLevel).length;
  return {
    effectiveLevel,
    hitDice: hitDice[index],
    baseAttackBonus: hitDice[index],
    baseSaveBonus: saves[index],
    skillRanks: skillRanks[index],
    feats: feats[index],
    naturalArmorBonus: 2 * (naturalArmorIncreases + sizeIncreases),
    abilityScoreIncreases: Math.floor(effectiveLevel / 5),
    sizeIncreases,
    drakePowers,
    specialAbilities: [
      "Darkvision 60 feet",
      "Low-light vision",
      "Immune to sleep and paralysis",
      "Energy or elemental subtype",
      ...(drakePowers ? [`${drakePowers} selectable drake power${drakePowers === 1 ? "" : "s"}`] : []),
      ...(sizeIncreases ? [`${sizeIncreases} size increase${sizeIncreases === 1 ? "" : "s"}`] : []),
    ],
  };
}
