const abilityPattern = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";

const skillAbilityRule = new RegExp(
  `\\buses?\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}\\s+modifier\\s+instead of\\s+the skill(?:'|\\u2019)s typical ability\\s+for all\\s+(.+?)\\s+checks\\b`,
  "i",
);

const classSkillAbilityRule = new RegExp(
  `^All (.+?) become class skills and use ${abilityPattern} instead of ${abilityPattern}[.]?$`,
  "i",
);

const normalizedAbility = (value) => String(value ?? "").toLowerCase();

function listedSkills(value) {
  return value
    .replace(/,?\s+and\s+/i, ", ")
    .split(/,\s*/)
    .map((skill) => skill.trim().replace(/\s+skills$/i, ""))
    .filter(Boolean);
}

export function inferredArchetypeSkillAbilityDetails(archetype) {
  const overrides = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    const match = summary.match(skillAbilityRule);
    if (match) {
      overrides.push(...listedSkills(match[2]).map((skill) => ({
        sourceFeatureId: feature.id,
        skill,
        ability: normalizedAbility(match[1]),
        minimumLevel: feature.level,
      })));
      continue;
    }
    const classSkillMatch = summary.match(classSkillAbilityRule);
    if (!classSkillMatch) continue;
    overrides.push(...listedSkills(classSkillMatch[1]).map((skill) => ({
      sourceFeatureId: feature.id,
      skill,
      ability: normalizedAbility(classSkillMatch[2]),
      replacesAbility: normalizedAbility(classSkillMatch[3]),
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
      const skillGroup = skill.split(" (")[0];
      if ((override.skill !== skill && override.skill !== skillGroup) || override.condition) continue;
      if (level < (override.minimumLevel ?? 1) || level > (override.maximumLevel ?? 20)) continue;
      if (override.replacesAbility && result !== override.replacesAbility) continue;
      result = override.ability;
    }
  }
  return result;
}
