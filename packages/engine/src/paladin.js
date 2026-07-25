function assertPaladinLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new RangeError("Paladin level must be an integer from 1 to 20.");
  }
}

export function paladinSmiteUses(level) {
  assertPaladinLevel(level);
  return 1 + Math.floor((level - 1) / 3);
}

export function paladinLayOnHands(level, charismaModifier = 0) {
  assertPaladinLevel(level);
  if (!Number.isInteger(charismaModifier)) throw new RangeError("Charisma modifier must be an integer.");
  if (level < 2) return { dice: 0, usesPerDay: 0 };
  return {
    dice: Math.floor(level / 2),
    usesPerDay: Math.max(0, Math.floor(level / 2) + charismaModifier)
  };
}

export function paladinMercyCount(level) {
  assertPaladinLevel(level);
  return Math.floor(level / 3);
}

export function paladinDivineBondUses(level) {
  assertPaladinLevel(level);
  return level < 5 ? 0 : 1 + Math.floor((level - 5) / 4);
}

export function paladinCasterLevel(level) {
  assertPaladinLevel(level);
  return Math.max(0, level - 3);
}
