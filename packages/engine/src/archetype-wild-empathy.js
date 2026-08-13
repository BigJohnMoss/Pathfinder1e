const detailsCache = new WeakMap();

const normalizedText = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/\s+/g, " ")
  .trim();

const cleanTarget = (value) => normalizedText(value)
  .replace(/^(?:only\s+)?(?:on|with)\s+/i, "")
  .replace(/\s+(?:under normal conditions|instead of animals)$/i, "")
  .replace(/[.;]$/, "")
  .trim();

const ruleKey = (rule) => JSON.stringify([
  rule.sourceFeatureId,
  rule.checkName,
  rule.targets,
  rule.bonus,
  rule.action,
  rule.ability,
  rule.skill,
]);

function rulesFromFeature(archetype, feature, summary) {
  const rules = [];
  const add = (rule) => rules.push({
    sourceFeatureId: feature.id,
    label: feature.name.replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, ""),
    classId: archetype.classId,
    minimumLevel: feature.level ?? 1,
    checkName: "Wild Empathy",
    ability: "charisma",
    ...rule,
  });

  const specialist = summary.match(/\bcan use (?:(?:her|his|their) )?wild empathy(?: ability)? with (.+?) as a full-round action with a \+(\d+) bonus\b/i);
  if (specialist) add({ targets: cleanTarget(specialist[1]), bonus: Number(specialist[2]), action: "full-round action" });

  const split = summary.match(/\bgains? a \+(\d+) bonus on wild empathy checks? (?:on|with) (.+?), but (?:she|he|they) takes? a -(\d+) penalty on checks? (?:on|with) (.+?)(?:\.|$)/i);
  if (split) {
    add({ targets: cleanTarget(split[2]), bonus: Number(split[1]) });
    add({ targets: cleanTarget(split[4]), bonus: -Number(split[3]) });
  }

  const companion = summary.match(/\bgains? a \+(\d+) bonus on wild empathy(?: checks?)? (?:made )?(?:regarding|with) (?:her|his|their) (animal )?companion\b/i);
  if (companion) add({ targets: `${companion[2] ?? ""}companion`.trim(), bonus: Number(companion[1]) });

  const chosenAnimals = summary.match(/\bgains? a \+(\d+) [a-z]+ bonus on [^.]{0,40}?wild empathy checks? with animals of that type\b/i);
  if (chosenAnimals) add({ targets: "animals of the chosen type", bonus: Number(chosenAnimals[1]) });

  const onlyPatterns = [
    /\bwild empathy functions? only (?:with|on) (.+?)(?:\.| However|, but)/i,
    /\bcan use wild empathy only on (.+?)(?:\.|, but)/i,
    /\bwild empathy affects? only (.+?)(?:\.|, but)/i,
    /\bgains? the wild empathy ability, but can use it only to influence (.+?)(?:\.|, but)/i,
  ];
  for (const pattern of onlyPatterns) {
    const match = summary.match(pattern);
    if (match) add({ targets: cleanTarget(match[1]), bonus: 0 });
  }

  const classGrant = summary.match(/\bgains? the wild empathy druid class feature[^.]*using (?:her|his|their) ([a-z]+) level as (?:her|his|their) druid level/i);
  if (classGrant) add({ targets: "animals", bonus: 0, classId: classGrant[1].toLowerCase() });

  const asWildEmpathy = summary.match(/\bcan influence the attitude of (.+?), as the druid's wild empathy class feature[\s\S]{0,240}?uses? (?:her|his|their) ([a-z]+) level as (?:her|his|their) druid level/i);
  if (asWildEmpathy) add({ targets: cleanTarget(asWildEmpathy[1]), bonus: 0, classId: asWildEmpathy[2].toLowerCase() });

  const formulaTarget = summary.match(/\bcan improve the attitude of ([^.]+?)\./i);
  const formulaClass = summary.match(/\brolls? 1d20 and adds? (?:her|his|their) ([a-z]+) level and (?:her|his|their) Charisma modifier/i);
  if (formulaTarget && formulaClass) add({ targets: cleanTarget(formulaTarget[1]), bonus: 0, classId: formulaClass[1].toLowerCase(), checkName: /plant|green/i.test(feature.name) ? "Green Empathy" : /elemental/i.test(feature.name) ? "Elemental Empathy" : "Wild Empathy", action: /takes? 1 minute/i.test(summary) ? "1 minute" : undefined });

  const inheritedTarget = summary.match(/\bcan improve the (?:initial )?attitude of ([^.]+?)\.(?: This ability)?[^.]{0,100}?(?:functions? (?:just )?(?:like|as)|as if using) (?:the )?(?:druid's )?wild empathy/i);
  if (inheritedTarget && !formulaTarget) add({ targets: cleanTarget(inheritedTarget[1]), bonus: 0 });

  const penaltyTarget = summary.match(/\bcan (?:also )?use (?:this ability|wild empathy) to influence (.+?), but (?:she|he|they) takes? a -(\d+) penalty on the check/i);
  if (penaltyTarget) add({ targets: cleanTarget(penaltyTarget[1]), bonus: -Number(penaltyTarget[2]) });

  return [...new Map(rules.map((rule) => [ruleKey(rule), rule])).values()];
}

function sentenceFullyCovered(sentence) {
  return /\bcan use (?:(?:her|his|their) )?wild empathy(?: ability)? with .+? as a full-round action with a \+\d+ bonus\b/i.test(sentence)
    || /\bgains? a \+\d+ bonus on wild empathy checks? (?:on|with) .+?, but (?:she|he|they) takes? a -\d+ penalty on checks? (?:on|with) /i.test(sentence)
    || /\bwild empathy (?:functions?|affects?) only (?:with|on) /i.test(sentence)
    || /\bcan use wild empathy only on /i.test(sentence)
    || /\bgains? the wild empathy ability, but can use it only to influence /i.test(sentence)
    || /\bgains? the wild empathy druid class feature[^.]*using .+? level as .+? druid level/i.test(sentence)
    || /\bcan influence the attitude of .+?, as the druid's wild empathy class feature[^.]*uses? .+? level as .+? druid level/i.test(sentence);
}

const replacementBoilerplate = (sentence) => /^(?:This|These) (?:ability|feature|abilities|features)?\s*(?:otherwise )?(?:replaces?|alters?|modifies?|counts? as|functions? as)\b/i.test(sentence);

export function inferredArchetypeWildEmpathyDetails(archetype) {
  if (archetype && detailsCache.has(archetype)) return detailsCache.get(archetype);
  const adjustments = [];
  const sentenceCoverage = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = normalizedText(feature.summary);
    const rules = rulesFromFeature(archetype, feature, summary);
    if (!rules.length) continue;
    adjustments.push(...rules);
    const sentences = summary.split(/(?<=[.!?])\s+/);
    const covered = new Set();
    for (const [sentenceIndex, sentence] of sentences.entries()) if (sentenceFullyCovered(sentence)) {
      sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
      covered.add(sentenceIndex);
    }
    if (sentences.every((sentence, sentenceIndex) => covered.has(sentenceIndex) || replacementBoilerplate(sentence))) fullyAutomatedFeatureIds.add(feature.id);
  }
  const result = { adjustments: [...new Map(adjustments.map((rule) => [ruleKey(rule), rule])).values()], sentenceCoverage, fullyAutomatedFeatureIds };
  if (archetype && typeof archetype === "object") detailsCache.set(archetype, result);
  return result;
}

export const inferArchetypeWildEmpathyAdjustments = (archetype) => inferredArchetypeWildEmpathyDetails(archetype).adjustments;

export function archetypeWildEmpathyChecks(characterClasses = [], classLevels = {}, abilityModifiers = {}, skillTotals = {}) {
  const checks = [];
  for (const characterClass of characterClasses ?? []) {
    const level = Math.max(0, Number(classLevels[characterClass.id]) || 0);
    if (!level) continue;
    const rules = (characterClass.wildEmpathyAdjustments ?? []).filter((rule) => level >= (rule.minimumLevel ?? 1) && level <= (rule.maximumLevel ?? 20));
    const hasBase = (characterClass.features ?? []).some((feature) => feature.level <= level && feature.id === `${characterClass.id}-wild-empathy-1`);
    const baseRule = { sourceFeatureId: `${characterClass.id}-wild-empathy`, label: "Wild Empathy", classId: characterClass.id, checkName: "Wild Empathy", targets: "animals", ability: "charisma", bonus: 0 };
    const activeRules = [...(hasBase ? [baseRule] : []), ...rules];
    for (const [index, rule] of activeRules.entries()) {
      const effectiveLevel = Math.max(0, Number(classLevels[rule.classId ?? characterClass.id]) || level);
      const base = rule.skill ? Number(skillTotals[rule.skill] ?? 0) : effectiveLevel + Number(abilityModifiers[rule.ability ?? "charisma"] ?? 0);
      checks.push({
        id: `wild-empathy-${characterClass.id}-${rule.sourceFeatureId ?? index}-${index}`,
        name: `${rule.checkName ?? "Wild Empathy"} - ${rule.targets ?? "animals"}`,
        modifier: base + (rule.bonus ?? 0),
        description: [rule.label, rule.action, rule.condition].filter(Boolean).join(" - "),
      });
    }
  }
  return [...new Map(checks.map((check) => [check.name, check])).values()];
}
