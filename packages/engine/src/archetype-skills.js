const knowledgeSkills = [
  "Knowledge (arcana)",
  "Knowledge (dungeoneering)",
  "Knowledge (engineering)",
  "Knowledge (geography)",
  "Knowledge (history)",
  "Knowledge (local)",
  "Knowledge (nature)",
  "Knowledge (nobility)",
  "Knowledge (planes)",
  "Knowledge (religion)",
];

const namedSkills = [
  "Use Magic Device",
  "Sleight of Hand",
  "Sense Motive",
  "Handle Animal",
  "Disable Device",
  "Escape Artist",
  "Acrobatics",
  "Appraise",
  "Bluff",
  "Climb",
  "Diplomacy",
  "Disguise",
  "Fly",
  "Heal",
  "Intimidate",
  "Linguistics",
  "Perception",
  "Ride",
  "Spellcraft",
  "Stealth",
  "Survival",
  "Swim",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const simpleSkillPattern = namedSkills.map(escapeRegExp).join("|");
const exactSkillPattern = new RegExp(
  `Knowledge \\((?:all|arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)\\)|Craft \\([^)]+\\)|Perform \\([^)]+\\)|Profession \\([^)]+\\)|${simpleSkillPattern}`,
  "gi",
);

const canonicalSimpleSkills = new Map(namedSkills.map((skill) => [skill.toLowerCase(), skill]));
const canonicalSkill = (raw) => {
  const value = raw.trim();
  const simple = canonicalSimpleSkills.get(value.toLowerCase());
  if (simple) return simple;
  return value.replace(/^(knowledge|craft|perform|profession)\s*\(([^)]+)\)$/i, (_, family, specialty) =>
    `${family[0].toUpperCase()}${family.slice(1).toLowerCase()} (${specialty.trim().toLowerCase()})`,
  );
};

function exactSkillsInClause(rawClause) {
  let clause = String(rawClause).replace(/[’]/g, "'").trim();
  const tail = clause.match(/^(.*?),\s+and\s+(?:can|may|must|also|creates?|takes?|treats?|is|are|has|gains?|receives?|learns?|becomes?)\b/i);
  const omittedTail = Boolean(tail);
  if (tail) clause = tail[1].trim();
  if (/\b(?:when|whenever|while|against|during|within|under the effects?|for the purpose|made to|attempted to|to (?:create|identify|influence|notice|recognize|recall|avoid|track|find|determine|demoralize|feint|disguise|escape))\b/i.test(clause))
    return null;
  const allKnowledge = /\ball Knowledge(?: skill)? checks?\b/i.test(clause);
  const matches = [...clause.matchAll(exactSkillPattern)];
  const skills = matches.flatMap((match) =>
    /^Knowledge \(all\)$/i.test(match[0]) ? knowledgeSkills : [canonicalSkill(match[0])],
  );
  if (allKnowledge) skills.push(...knowledgeSkills);
  if (!skills.length) return null;
  const residual = clause
    .replace(/\ball Knowledge(?: skill)? checks?\b/gi, "")
    .replace(exactSkillPattern, "")
    .replace(/\b(?:all|checks?|skills?|as well as|and|or)\b/gi, "")
    .replace(/[,+/&;:()[\]\s-]/g, "");
  if (residual) return null;
  return { skills: [...new Set(skills)], omittedTail };
}

const splitSentences = (summary) => String(summary ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .split(/(?<=[.!?])\s+/)
  .filter(Boolean);

const replacementBoilerplate = (sentence) =>
  /^(?:This|These) (?:ability|feature|abilities|features)?\s*(?:otherwise )?(?:replaces?|alters?|modifies?|counts? as|functions? as)\b/i.test(sentence) ||
  /^(?:This|These) replaces?\b/i.test(sentence);

function adjustmentsFromFeature(feature) {
  const adjustments = [];
  let fullyAutomated = true;
  const summary = String(feature.summary ?? "");
  if (
    /\b(?:this|the|these|both) bonus(?:es)?[^.]{0,80}(?:double|increase)|\bbonus increases (?:by|to)|\bbonuses increase\b/i.test(summary) ||
    /\b(?:choose|chooses|chosen|select|selects|selected) (?:one|a|an|from)|\bone of the (?:following|options)|\bfollowing (?:abilities|aspects|benefits|blessings|enhancements|mutations|options)\b/i.test(summary)
  ) return { adjustments, fullyAutomated: false };
  for (const sentence of splitSentences(summary)) {
    if (replacementBoilerplate(sentence)) continue;
    const halfLevel = sentence.match(/\b(?:adds?|gains?|receives?) (?:a bonus equal to )?(?:one-)?half (?:of )?(?:his|her|their) (?:\w+ )?class level(?: \(minimum \+?1\)|,? minimum \+?1)? (?:as a bonus )?(?:on|to) (.+?)[.]?$/i);
    if (halfLevel) {
      const prefix = sentence.slice(0, halfLevel.index);
      if (/\b(?:when|whenever|while|if|unless|during|wearing|wielding|under|with at least)\b|\b(?:allies|ally|animals?|companions?|constructs?|creatures?|eidolons?|familiars?|mounts?|phantoms?|targets?)\b/i.test(prefix)) {
        fullyAutomated = false;
        continue;
      }
      const parsed = exactSkillsInClause(halfLevel[1]);
      if (parsed) {
        adjustments.push(...parsed.skills.map((skill) => ({
          sourceFeatureId: feature.id,
          skill,
          minimumLevel: feature.level ?? 1,
          base: 0,
          levelDivisor: 2,
          minimum: 1,
        })));
        if (parsed.omittedTail) fullyAutomated = false;
        continue;
      }
    }
    const fixed = sentence.match(/\b(?:gains?|receives?|has) (?:an? )?\+(\d+) (?:alchemical |circumstance |competence |enhancement |insight |morale |profane |racial |sacred |trait |untyped )?bonus (?:on|to) (.+?)[.]?$/i);
    if (fixed) {
      const prefix = sentence.slice(0, fixed.index);
      if (/\b(?:when|whenever|while|if|unless|during|wearing|wielding|under|with at least)\b|\b(?:allies|ally|animals?|companions?|constructs?|creatures?|eidolons?|familiars?|mounts?|phantoms?|targets?)\b/i.test(prefix)) {
        fullyAutomated = false;
        continue;
      }
      const parsed = exactSkillsInClause(fixed[2]);
      if (parsed) {
        adjustments.push(...parsed.skills.map((skill) => ({
          sourceFeatureId: feature.id,
          skill,
          minimumLevel: feature.level ?? 1,
          base: Number(fixed[1]),
        })));
        if (parsed.omittedTail) fullyAutomated = false;
        continue;
      }
    }
    fullyAutomated = false;
  }
  return { adjustments, fullyAutomated: fullyAutomated && adjustments.length > 0 };
}

export function inferredArchetypeSkillBonusDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) {
    for (const feature of replacement.features ?? []) {
      const inferred = adjustmentsFromFeature(feature);
      adjustments.push(...inferred.adjustments);
      if (inferred.fullyAutomated) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  return { adjustments, fullyAutomatedFeatureIds };
}

export function inferArchetypeSkillBonusAdjustments(archetype) {
  return inferredArchetypeSkillBonusDetails(archetype).adjustments;
}

export function archetypeSkillBonusAdjustments(archetype) {
  const explicit = archetype?.skillBonusAdjustments ?? [];
  const explicitKeys = new Set(explicit.map((adjustment) => `${adjustment.skill}:${adjustment.condition ?? ""}`));
  const inferred = inferArchetypeSkillBonusAdjustments(archetype).filter((adjustment) =>
    !explicitKeys.has(`${adjustment.skill}:${adjustment.condition ?? ""}`),
  );
  return [...explicit, ...inferred];
}
