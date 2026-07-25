export function bardicPerformanceRounds(level, charismaModifier = 0) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
  if (!Number.isInteger(charismaModifier)) throw new TypeError("Charisma modifier must be an integer.");
  return Math.max(0, 4 + charismaModifier + (2 * (level - 1)));
}
