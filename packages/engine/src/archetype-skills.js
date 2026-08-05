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

const ordinal = "(?:st|nd|rd|th)";

function scalingSchedule(sentences) {
  const candidates = sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence }) => /\bbonus(?:es)?[^.]{0,100}(?:double|increase)/i.test(sentence));
  if (candidates.length !== 1) return null;
  const [{ sentence, index }] = candidates;
  if (/\b(?:if|when|whenever|while|unless)\b/i.test(sentence)) return null;
  const maximumMatch = sentence.match(/maximum(?: bonus)?(?: of)? \+?(\d+)(?: at \d+(?:st|nd|rd|th) level)?/i);
  const maximum = maximumMatch ? Number(maximumMatch[1]) : undefined;
  if (/\bincreases? to\b/i.test(sentence)) {
    const milestones = [...sentence.matchAll(new RegExp(`\\+(\\d+) at (\\d+)${ordinal} level`, "gi"))]
      .map((match) => ({ level: Number(match[2]), bonus: Number(match[1]) }));
    return milestones.length ? { index, milestones, maximum } : null;
  }
  const atAndEvery = sentence.match(new RegExp(`At (\\d+)${ordinal} level,?(?: and|, and)? every (\\d+) [^.]{0,40}?levels? thereafter,? (?:this|these|the) bonus(?:es)?[^.]{0,40}?increases? by \\+?(\\d+)`, "i"));
  if (atAndEvery) return { index, firstLevel: Number(atAndEvery[1]), interval: Number(atAndEvery[2]), increment: Number(atAndEvery[3]), maximum };
  const increaseAtAndEvery = sentence.match(new RegExp(`(?:this|these|the) bonus(?:es)?[^.]{0,40}?increases? by \\+?(\\d+) at (\\d+)${ordinal} level and (?:again )?every (\\d+) [^.]{0,30}?levels?`, "i"));
  if (increaseAtAndEvery) return { index, firstLevel: Number(increaseAtAndEvery[2]), interval: Number(increaseAtAndEvery[3]), increment: Number(increaseAtAndEvery[1]), maximum };
  const everyThereafter = sentence.match(/(?:this|these|the) bonus(?:es)?[^.]{0,40}?increases? by \+?(\d+) every (\d+) [^.]{0,30}?levels? thereafter/i);
  if (everyThereafter) return { index, interval: Number(everyThereafter[2]), increment: Number(everyThereafter[1]), maximum };
  const everyLevels = sentence.match(new RegExp(`(?:this|these|the) bonus(?:es)?[^.]{0,40}?increases? by \\+?(\\d+) for every (\\d+) [^.]{0,25}?levels?(?: (?:beyond|after) (\\d+)${ordinal}| that (?:he|she|they) possesses?)`, "i"));
  if (everyLevels) {
    const interval = Number(everyLevels[2]);
    const threshold = everyLevels[3] ? Number(everyLevels[3]) : 0;
    return { index, firstLevel: threshold ? threshold + interval : interval, interval, increment: Number(everyLevels[1]), maximum };
  }
  return null;
}

function bonusTable(schedule, base, minimumLevel) {
  if (schedule.milestones) return [
    { level: minimumLevel, bonus: base },
    ...schedule.milestones.filter((step) => step.level > minimumLevel),
  ];
  const firstLevel = schedule.firstLevel ?? minimumLevel + schedule.interval;
  if (firstLevel <= minimumLevel || firstLevel > 20 || schedule.interval < 1 || schedule.increment < 1) return null;
  const steps = [{ level: minimumLevel, bonus: base }];
  let bonus = base;
  for (let level = firstLevel; level <= 20; level += schedule.interval) {
    bonus = Math.min(schedule.maximum ?? Number.POSITIVE_INFINITY, bonus + schedule.increment);
    steps.push({ level, bonus });
    if (bonus === schedule.maximum) break;
  }
  return steps;
}

function adjustmentsFromFeature(feature) {
  const adjustments = [];
  let fullyAutomated = true;
  const summary = String(feature.summary ?? "");
  if (/\b(?:choose|chooses|chosen|select|selects|selected) (?:one|a|an|from)|\bone of the (?:following|options)|\bfollowing (?:abilities|aspects|benefits|blessings|enhancements|mutations|options)\b/i.test(summary))
    return { adjustments, fullyAutomated: false };
  const sentences = splitSentences(summary);
  const scaling = scalingSchedule(sentences);
  const hasUnparsedScaling = /\b(?:this|the|these|both) bonus(?:es)?[^.]{0,80}(?:double|increase)|\bbonus increases (?:by|to)|\bbonuses increase\b/i.test(summary) && !scaling;
  if (hasUnparsedScaling) return { adjustments, fullyAutomated: false };
  let lastParsedSentenceIndex = -1;
  const minimumLevelFor = (sentence, sentenceIndex) => {
    const stated = sentence.match(/^(?:At|Beginning at|Starting at) (\d+)(?:st|nd|rd|th) level\b/i);
    if (stated) return Number(stated[1]);
    if (scaling?.firstLevel === feature.level && sentenceIndex < scaling.index) return 1;
    return feature.level ?? 1;
  };
  for (const [sentenceIndex, sentence] of sentences.entries()) {
    if (replacementBoilerplate(sentence)) continue;
    if (sentenceIndex === scaling?.index) continue;
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
          minimumLevel: minimumLevelFor(sentence, sentenceIndex),
          base: 0,
          levelDivisor: 2,
          minimum: 1,
        })));
        lastParsedSentenceIndex = sentenceIndex;
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
          minimumLevel: minimumLevelFor(sentence, sentenceIndex),
          base: Number(fixed[1]),
        })));
        lastParsedSentenceIndex = sentenceIndex;
        if (parsed.omittedTail) fullyAutomated = false;
        continue;
      }
    }
    fullyAutomated = false;
  }
  if (scaling) {
    if (!adjustments.length || lastParsedSentenceIndex !== scaling.index - 1 || new Set(adjustments.map((adjustment) => adjustment.base)).size !== 1)
      return { adjustments: [], fullyAutomated: false };
    for (const adjustment of adjustments) {
      const table = bonusTable(scaling, adjustment.base, adjustment.minimumLevel);
      if (!table) return { adjustments: [], fullyAutomated: false };
      adjustment.bonusByLevel = table;
    }
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
