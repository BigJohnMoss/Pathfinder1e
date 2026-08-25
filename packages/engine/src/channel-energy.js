export function channelEnergyProgression(level, charismaModifier = 0) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
  if (!Number.isInteger(charismaModifier)) throw new RangeError("Charisma modifier must be an integer.");
  return {
    dice: 1 + Math.floor((level - 1) / 2),
    saveDC: 10 + Math.floor(level / 2) + charismaModifier,
    usesPerDay: Math.max(0, 3 + charismaModifier)
  };
}

export function channelEnergyPolarityOptionIdsForAlignment(alignment) {
  const value = String(alignment ?? "neutral");
  if (value.includes("good")) return ["hex-channeler-positive"];
  if (value.includes("evil")) return ["hex-channeler-negative"];
  return ["hex-channeler-positive", "hex-channeler-negative"];
}
