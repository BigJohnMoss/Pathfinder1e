const abilityPattern = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";

const skillAbilityRule = new RegExp(
  `\\buses?\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}\\s+modifier\\s+instead of\\s+the skill(?:'|\\u2019)s typical ability\\s+for all\\s+(.+?)\\s+checks\\b`,
  "i",
);

const normalizedAbility = (value) => String(value ?? "").toLowerCase();

function listedSkills(value) {
  return value
    .replace(/,?\s+and\s+/i, ", ")
    .split(/,\s*/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function inferredArchetypeSkillAbilityDetails(archetype) {
  const overrides = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const match = String(feature.summary ?? "").replace(/\s+/g, " ").match(skillAbilityRule);
    if (!match) continue;
    overrides.push(...listedSkills(match[2]).map((skill) => ({
      sourceFeatureId: feature.id,
      skill,
      ability: normalizedAbility(match[1]),
      minimumLevel: feature.level,
    })));
  }
  return { overrides };
}

export function inferArchetypeSkillAbilityOverrides(archetype) {
  return inferredArchetypeSkillAbilityDetails(archetype).overrides;
}

export function archetypeSkillAbilityOverrides(archetype) {
  const explicit = archetype?.skillAbilityOverrides ?? [];
  const explicitSkills = new Set(explicit.map((override) => override.skill));
  return [
    ...explicit,
    ...inferArchetypeSkillAbilityOverrides(archetype).filter((override) => !explicitSkills.has(override.skill)),
  ];
}

export function effectiveArchetypeSkillAbility(archetypes, classLevels, skill, defaultAbility) {
  let result = defaultAbility;
  for (const archetype of archetypes ?? []) {
    const level = classLevels?.[archetype.classId] ?? 0;
    for (const override of archetypeSkillAbilityOverrides(archetype)) {
      if (override.skill !== skill || override.condition) continue;
      if (level < (override.minimumLevel ?? 1) || level > (override.maximumLevel ?? 20)) continue;
      result = override.ability;
    }
  }
  return result;
}
