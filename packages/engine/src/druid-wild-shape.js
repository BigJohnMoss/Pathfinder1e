export function druidWildShapeUses(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("level must be an integer from 1 to 20");
  if (level < 4) return 0;
  if (level === 20) return null;
  return Math.min(8, Math.floor(level / 2) - 1);
}
