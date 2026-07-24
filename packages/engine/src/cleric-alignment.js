const coordinates = {
  "lawful-good": [0, 0], "neutral-good": [1, 0], "chaotic-good": [2, 0],
  "lawful-neutral": [0, 1], neutral: [1, 1], "chaotic-neutral": [2, 1],
  "lawful-evil": [0, 2], "neutral-evil": [1, 2], "chaotic-evil": [2, 2]
};

export function alignmentsWithinOneStep(options, deityAlignment) {
  const deity = coordinates[deityAlignment];
  if (!Array.isArray(options) || !deity) return [];
  return options.filter((option) => {
    const alignment = coordinates[option.alignment];
    return alignment && Math.abs(alignment[0] - deity[0]) + Math.abs(alignment[1] - deity[1]) <= 1;
  });
}

export function channelEnergyChoices(options, characterAlignment, deityAlignment) {
  if (!Array.isArray(options) || !coordinates[characterAlignment] || !coordinates[deityAlignment]) return [];
  const morality = characterAlignment.endsWith("good") ? "good" : characterAlignment.endsWith("evil") ? "evil" : "neutral";
  const deityMorality = deityAlignment.endsWith("good") ? "good" : deityAlignment.endsWith("evil") ? "evil" : "neutral";
  const allowed = morality === "good" || (morality === "neutral" && deityMorality === "good")
    ? ["positive"]
    : morality === "evil" || (morality === "neutral" && deityMorality === "evil")
      ? ["negative"]
      : ["positive", "negative"];
  return options.filter((option) => allowed.includes(option.polarity));
}
