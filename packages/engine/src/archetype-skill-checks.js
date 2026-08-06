import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

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
  "Use Magic Device", "Sleight of Hand", "Sense Motive", "Handle Animal", "Disable Device", "Escape Artist",
  "Acrobatics", "Appraise", "Bluff", "Climb", "Craft", "Diplomacy", "Disguise", "Fly", "Heal",
  "Intimidate", "Linguistics", "Perception", "Perform", "Profession", "Ride", "Spellcraft", "Stealth",
  "Survival", "Swim",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const namedSkillPattern = new RegExp(namedSkills.map(escapeRegExp).join("|"), "gi");
const specificKnowledgePattern = /Knowledge \((?:arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)\)/gi;
const canonicalSkills = new Map([...namedSkills, ...knowledgeSkills].map((skill) => [skill.toLowerCase(), skill]));

function skillsFromClause(clause) {
  if (/\b(?:affected|chosen|selected|such|these|those) (?:skill|check)|\bany skill check\b/i.test(clause)) return [];
  const skills = [];
  if (/\b(?:(?:all|any) )?Knowledge(?: skill)? checks?\b/i.test(clause) || /\bchecks? with any Knowledge skill\b/i.test(clause)) skills.push(...knowledgeSkills);
  for (const match of clause.matchAll(specificKnowledgePattern)) skills.push(canonicalSkills.get(match[0].toLowerCase()));
  specificKnowledgePattern.lastIndex = 0;
  for (const match of clause.matchAll(namedSkillPattern)) skills.push(canonicalSkills.get(match[0].toLowerCase()));
  namedSkillPattern.lastIndex = 0;
  if (/\bchecks? to jump\b/i.test(clause)) skills.push("Acrobatics");
  return [...new Set(skills.filter(Boolean))];
}

function conditionFrom(sentence, matchIndex, clause) {
  const prefix = sentence.slice(0, matchIndex).replace(/^At \d+(?:st|nd|rd|th) level,?\s*/i, "");
  const leading = prefix.match(/\b(While|When|Whenever|Within|During|If|As long as)\s+(.+?),\s*(?:(?:he|she|they)|(?:an?|the) [a-z][a-z' -]{0,60})\s*$/i);
  const scoped = clause.match(/\b(while|when|within|during|involving|regarding|related to|to identify|to harvest|attempted within)\s+(.+)$/i);
  const raw = leading ? `${leading[1]} ${leading[2]}` : scoped ? `${scoped[1]} ${scoped[2]}` : "";
  return raw ? raw[0].toLowerCase() + raw.slice(1).replace(/[.,)]$/, "").trim() : undefined;
}

function rulesFromSentence(feature, sentence, summary, contextualCondition, fallbackSkills = []) {
  if (/\bcannot take (?:10|20)|\bdoes not gain the ability to take (?:10|20)/i.test(sentence)) return [];
  const patterns = [
    /\b(?:(?:can|may)\s+(?:always\s+)?(?:choose to\s+)?|gains? (?:the )?(?:standard )?ability to\s+)take\s+(?<result>10|20)\s+on\s+(?<clause>.+?)(?=,\s*(?:even|though|but|and can|and may)|[.]|$)/gi,
    /\b(?:(?:can|may)\s+(?:always\s+)?(?:choose to\s+)?|gains? (?:the )?(?:standard )?ability to\s+)take\s+(?<result>10|20)\s+when making\s+(?<clause>.+?)(?=,|[.]|$)/gi,
  ];
  const matches = patterns.flatMap((pattern) => [...sentence.matchAll(pattern)]).sort((left, right) => left.index - right.index);
  return matches.flatMap((match) => {
    if (/\b(?:allies|ally|companions?|creatures?|eidolons?|familiars?|mounts?|phantoms?|targets?)\s*$/i.test(sentence.slice(Math.max(0, match.index - 80), match.index))) return [];
    const result = Number(match.groups.result);
    if (result === 20 && /\b(?:once|twice|three times|\d+ times?|number of times)[^.]{0,120}\bper day\b/i.test(summary)) return [];
    const clause = match.groups.clause;
    const parsedSkills = skillsFromClause(clause);
    const skills = parsedSkills.length ? parsedSkills : (/\b(?:these|such|those) checks?\b/i.test(clause) ? fallbackSkills : []);
    if (!skills.length) return [];
    const condition = conditionFrom(sentence, match.index, clause) ?? contextualCondition;
    const announcedLevels = [...sentence.slice(0, match.index).matchAll(/\b(?:(?:At|Starting at|Beginning at) |Upon (?:achieving|reaching) )(\d+)(?:st|nd|rd|th) level\b/gi)];
    return [{
      sourceFeatureId: feature.id,
      label: feature.name.replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, ""),
      minimumLevel: Number(announcedLevels.at(-1)?.[1] ?? feature.level ?? 1),
      skills,
      result,
      allowsStress: /\beven (?:if|when)\b|\b(?:rushed|threatened|distracted|endangered|immediate danger)\b/i.test(sentence),
      trainedOnly: /\bhas ranks? in\b|\bwith (?:a rank|ranks) in\b/i.test(clause),
      ...(condition ? { condition } : {}),
    }];
  });
}

const takeRuleOnlySentence = (sentence) => /^(?:At \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they|you)|(?:an?|the) [a-z][a-z' -]{0,80})\s+(?:can|may)\s+(?:always\s+)?(?:choose to\s+)?take\s+(?:10|20)\s+(?:on|when making)\s+.+[.]?$/i.test(sentence);

export function inferredArchetypeSkillCheckDetails(archetype) {
  const rules = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) for (const feature of replacement.features ?? []) {
    const summary = String(feature.summary ?? "");
    const sentences = archetypeRuleSentences(summary);
    const parsedIndexes = new Set();
    let contextLevel = Number(feature.level ?? 1);
    let lastRuleSkills = [];
    for (const [index, sentence] of sentences.entries()) {
      const announcedLevel = [...sentence.matchAll(/\b(?:(?:At|Starting at|Beginning at) |Upon (?:achieving|reaching) )(\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1];
      if (announcedLevel) contextLevel = Number(announcedLevel);
      const previousContext = /^Furthermore\b/i.test(sentence)
        ? sentences[index - 1]?.match(/^\b(While|When|Whenever|Within|During|If|As long as)\s+(.+?),/i)
        : null;
      const contextualCondition = previousContext ? `${previousContext[1].toLowerCase()} ${previousContext[2]}` : undefined;
      const parsed = rulesFromSentence({ ...feature, level: contextLevel }, sentence, summary, contextualCondition, lastRuleSkills);
      if (!parsed.length) continue;
      parsedIndexes.add(index);
      rules.push(...parsed);
      lastRuleSkills = parsed.at(-1).skills;
    }
    if (parsedIndexes.size && sentences.every((sentence, index) => archetypeReplacementBoilerplate(sentence) || (parsedIndexes.has(index) && takeRuleOnlySentence(sentence)))) fullyAutomatedFeatureIds.add(feature.id);
  }
  const unique = [...new Map(rules.map((rule) => [JSON.stringify([rule.sourceFeatureId, rule.result, rule.skills, rule.condition]), rule])).values()];
  return { rules: unique, fullyAutomatedFeatureIds };
}

export const inferArchetypeSkillCheckRules = (archetype) => inferredArchetypeSkillCheckDetails(archetype).rules;

export function archetypeSkillCheckRules(archetypes = [], classLevels = {}) {
  return archetypes.flatMap((archetype) => {
    const classLevel = Math.max(0, Number(classLevels[archetype.classId]) || 0);
    const explicit = archetype.skillCheckRules ?? [];
    const inferred = inferArchetypeSkillCheckRules(archetype).filter((rule) => !explicit.some((row) => row.sourceFeatureId === rule.sourceFeatureId && row.result === rule.result));
    return [...explicit, ...inferred]
      .filter((rule) => classLevel >= (rule.minimumLevel ?? 1) && classLevel <= (rule.maximumLevel ?? 20))
      .map((rule) => ({ ...rule, source: archetype.name }));
  });
}
