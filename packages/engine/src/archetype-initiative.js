import { inferredArchetypeSkillBonusDetails } from "./archetype-skills.js";

export const archetypeRuleSentences = (summary) => String(summary ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .split(/(?<=[.!?])\s+/)
  .filter(Boolean);

export const archetypeReplacementBoilerplate = (sentence) =>
  /^(?:This|These) (?:ability|feature|abilities|features)?\s*(?:otherwise )?(?:replaces?|alters?|modifies?|counts? as|functions? as)\b/i.test(sentence) ||
  /^(?:This|These) replaces?\b/i.test(sentence);

export function archetypeRuleCondition(sentence, matchEnd) {
  const prefix = sentence.slice(0, Math.max(0, sentence.search(/\b(?:gains?|receives?|adds?|has)\b/i)));
  const leading = prefix.match(/(?:^(?:At \d+(?:st|nd|rd|th) level,?\s*)?)(When|Whenever|While|During|Within|As long as|If)\s+(.+?),\s*(?:(?:he|she|they|it)|(?:an?|the)\s+[a-z][a-z' -]{0,60})\s*(?:also\s*)?$/i);
  const suffix = sentence.slice(matchEnd).match(/\b(when|whenever|while|during|within|involving|against|as long as|(?<!as )if)\s+(.+?)(?=,\s+and\b|[.]|$)/i);
  const raw = leading ? `${leading[1]} ${leading[2]}` : suffix ? `${suffix[1]} ${suffix[2]}` : "";
  if (!raw) return undefined;
  return raw[0].toLowerCase() + raw.slice(1).replace(/[.]$/, "").trim();
}

export const archetypeUnsafeSubject = (sentence, matchIndex) =>
  /\b(?:allies|ally|animal companion|companions?|creatures?|eidolons?|familiars?|mounts?|phantoms?|spirit animals?|targets?)\b/i.test(sentence.slice(Math.max(0, matchIndex - 180), matchIndex)) ||
  /\b(?:does?|do|did) not\s+(?:gains?|receives?|has)\s*$/i.test(sentence.slice(Math.max(0, matchIndex - 30), matchIndex + 8));

function adjustmentFromSentence(feature, sentence) {
  const halfPatterns = [
    /\b(?:adds?|gains?|receives?) (?:an? )?(?:\w+ )?bonus (?:on|to) initiative (?:checks?|rolls?) equal to (?:(?:one-)?half|1\/2) (?:of )?(?:his|her|their) (?:(?:\w+ )?(?:class )?)?level(?: \(minimum \+?1\))?/i,
    /\b(?:adds?|gains?|receives?) (?:(?:one-)?half|1\/2) (?:of )?(?:his|her|their) (?:(?:\w+ )?(?:class )?)?level(?: \(minimum \+?1\))? (?:as a bonus )?(?:on|to) initiative (?:checks?|rolls?)/i,
    /\badds? 1\/2 (?:his|her|their) level \(minimum 1\) to initiative (?:checks?|rolls?)/i,
  ];
  for (const pattern of halfPatterns) {
    const match = pattern.exec(sentence);
    if (!match || archetypeUnsafeSubject(sentence, match.index)) continue;
    return {
      sourceFeatureId: feature.id,
      label: "Initiative checks",
      minimumLevel: Number(sentence.slice(0, match.index).match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
      base: 0,
      levelDivisor: 2,
      minimum: 1,
      ...(archetypeRuleCondition(sentence, match.index + match[0].length) ? { condition: archetypeRuleCondition(sentence, match.index + match[0].length) } : {}),
    };
  }

  const fixed = /\b(?:gains?|receives?|has) (?:an? )?\+(\d+) (?:alchemical |circumstance |competence |enhancement |insight |morale |profane |racial |sacred |trait |untyped )?bonus (?:on|to) initiative(?: checks?| rolls?)?/i.exec(sentence);
  if (!fixed || archetypeUnsafeSubject(sentence, fixed.index)) return null;
  const condition = archetypeRuleCondition(sentence, fixed.index + fixed[0].length);
  return {
    sourceFeatureId: feature.id,
    label: "Initiative checks",
    minimumLevel: Number(sentence.slice(0, fixed.index).match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
    base: Number(fixed[1]),
    ...(condition ? { condition } : {}),
  };
}

const initiativeOnlySentence = (sentence) =>
  (sentence.match(/\+\d+ (?:(?:alchemical|circumstance|competence|enhancement|insight|morale|profane|racial|sacred|trait|untyped) )?bonus\b/gi)?.length ?? 0) <= 1 &&
  !/\b(?:AC|Armor Class|attack|CMB|CMD|damage|immune|immunity|movement|penalty|resistance|saving throws?|skill checks?|speed)\b/i.test(sentence);

function copySkillProgression(adjustment, skillAdjustments) {
  const matching = skillAdjustments.filter((skill) => skill.sourceFeatureId === adjustment.sourceFeatureId && skill.base === adjustment.base);
  if (!matching.length) return adjustment;
  const signatures = new Set(matching.map((skill) => JSON.stringify({
    minimumLevel: skill.minimumLevel,
    maximumLevel: skill.maximumLevel,
    base: skill.base,
    perInterval: skill.perInterval,
    interval: skill.interval,
    levelDivisor: skill.levelDivisor,
    levelMultiplier: skill.levelMultiplier,
    minimum: skill.minimum,
    maximum: skill.maximum,
    bonusByLevel: skill.bonusByLevel,
    condition: skill.condition,
  })));
  if (signatures.size !== 1) return adjustment;
  const source = matching[0];
  return {
    ...adjustment,
    ...Object.fromEntries(Object.entries(source).filter(([key]) => !["skill", "sourceFeatureId", "condition"].includes(key))),
    label: adjustment.label,
    sourceFeatureId: adjustment.sourceFeatureId,
  };
}

const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const parsedNumber = (value) => Number(value) || numberWords[String(value).toLowerCase()] || 0;

export function archetypeRuleProgression(adjustment, summary, targetPattern = /\binitiative\b/i) {
  if (adjustment.bonusByLevel || adjustment.interval || adjustment.levelDivisor) return adjustment;
  const sentences = archetypeRuleSentences(summary).filter((sentence) =>
    (/\b(?:bonus|bonuses)\b/i.test(sentence) && /\b(?:increase|increases)\b/i.test(sentence)) ||
    /\bgains? an additional \+\d+ on each of those checks\b/i.test(sentence),
  );
  const relevant = sentences.find((sentence) => targetPattern.test(sentence)) ??
    (sentences.length === 1 ? sentences[0] : null);
  if (!relevant) return adjustment;
  const maximum = Number(relevant.match(/maximum(?: bonus)?(?: of)? \+?(\d+)/i)?.[1] ?? 0) || undefined;

  const initialMilestone = relevant.match(/increases? to \+(\d+) at (\d+)(?:st|nd|rd|th)(?: level)?/i);
  const increaseAfterMilestone = relevant.match(/increases? by (?:an additional )?\+?(\d+) every (\d+) levels? thereafter/i);
  if (initialMilestone && increaseAfterMilestone) {
    const bonusByLevel = [
      { level: adjustment.minimumLevel, bonus: adjustment.base },
      { level: Number(initialMilestone[2]), bonus: Number(initialMilestone[1]) },
    ];
    let bonus = Number(initialMilestone[1]);
    for (let level = Number(initialMilestone[2]) + Number(increaseAfterMilestone[2]); level <= 20; level += Number(increaseAfterMilestone[2])) {
      bonus = Math.min(maximum ?? Number.POSITIVE_INFINITY, bonus + Number(increaseAfterMilestone[1]));
      bonusByLevel.push({ level, bonus });
      if (bonus === maximum) break;
    }
    return { ...adjustment, ...(maximum ? { maximum } : {}), bonusByLevel };
  }

  if (/\bincreases? to\b/i.test(relevant)) {
    const milestones = [...relevant.matchAll(/\+(\d+) at (\d+)(?:st|nd|rd|th)(?: level)?/gi)]
      .map((match) => ({ level: Number(match[2]), bonus: Number(match[1]) }))
      .filter((step) => step.level > adjustment.minimumLevel);
    if (milestones.length) return { ...adjustment, bonusByLevel: [{ level: adjustment.minimumLevel, bonus: adjustment.base }, ...milestones] };
  }

  const atAndEvery = relevant.match(/At (\d+)(?:st|nd|rd|th) level(?:,? and| and) every (\d+) [^.]{0,50}?levels? thereafter[^.]{0,100}?bonus(?:es)?[^.]{0,80}?increases? by \+?(\d+)/i);
  const everyThereafter = relevant.match(/Every (\d+) [^.]{0,50}?levels? thereafter[^.]{0,100}?bonus(?:es)?[^.]{0,80}?increases? by \+?(\d+)/i);
  const additionalEvery = relevant.match(/Every (\d+) [^.]{0,50}?levels? thereafter[^.]{0,100}?gains? an additional \+(\d+) on each of those checks/i);
  const forEveryAfter = relevant.match(/bonus(?:es)?[^.]{0,60}?increases? by \+?(\d+) for every (\d+|one|two|three|four|five|six) [^.]{0,40}?levels? (?:after|beyond) (\d+)(?:st|nd|rd|th)/i);
  const increaseAtAndEvery = relevant.match(/bonus(?:es)?[^.]{0,60}?increases? by \+?(\d+) at (\d+)(?:st|nd|rd|th) level(?:,? and| and) (?:again )?every (\d+) [^.]{0,30}?levels?/i);
  let firstLevel;
  let interval;
  let increment;
  if (atAndEvery) {
    firstLevel = Number(atAndEvery[1]);
    interval = Number(atAndEvery[2]);
    increment = Number(atAndEvery[3]);
    if (firstLevel <= adjustment.minimumLevel) firstLevel = adjustment.minimumLevel + interval;
  } else if (everyThereafter) {
    interval = Number(everyThereafter[1]);
    increment = Number(everyThereafter[2]);
    firstLevel = adjustment.minimumLevel + interval;
  } else if (additionalEvery) {
    interval = Number(additionalEvery[1]);
    increment = Number(additionalEvery[2]);
    firstLevel = adjustment.minimumLevel + interval;
  } else if (forEveryAfter) {
    increment = Number(forEveryAfter[1]);
    interval = parsedNumber(forEveryAfter[2]);
    firstLevel = Number(forEveryAfter[3]) + interval;
  } else if (increaseAtAndEvery) {
    increment = Number(increaseAtAndEvery[1]);
    firstLevel = Number(increaseAtAndEvery[2]);
    interval = Number(increaseAtAndEvery[3]);
    if (firstLevel <= adjustment.minimumLevel) firstLevel = adjustment.minimumLevel + interval;
  }
  if (!firstLevel || !interval || !increment) return adjustment;
  const bonusByLevel = [{ level: adjustment.minimumLevel, bonus: adjustment.base }];
  let bonus = adjustment.base;
  for (let level = firstLevel; level <= 20; level += interval) {
    bonus = Math.min(maximum ?? Number.POSITIVE_INFINITY, bonus + increment);
    bonusByLevel.push({ level, bonus });
    if (bonus === maximum) break;
  }
  return { ...adjustment, bonusByLevel };
}

export function inferredArchetypeInitiativeBonusDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  const skillDetails = inferredArchetypeSkillBonusDetails(archetype);
  for (const replacement of archetype?.replacements ?? []) {
    for (const feature of replacement.features ?? []) {
      if (/^(?:Deeds?|Bonus Feats?)$/i.test(feature.name ?? "")) continue;
      const sentences = archetypeRuleSentences(feature.summary);
      const parsed = sentences.flatMap((sentence, index) => {
        const adjustment = adjustmentFromSentence(feature, sentence);
        return adjustment ? [{ index, adjustment: archetypeRuleProgression(copySkillProgression(adjustment, skillDetails.adjustments), feature.summary) }] : [];
      });
      for (const entry of parsed) {
        if (!entry.adjustment.condition) {
          const previousCondition = sentences[entry.index - 1]?.match(/\b(as long as\s+(?:he|she|they)\b.+?)(?=,\s+(?:an?|the|he|she|they)\b)/i);
          if (previousCondition) entry.adjustment.condition = previousCondition[1].toLowerCase();
        }
      }
      adjustments.push(...parsed.map(({ adjustment }) => adjustment));
      const hasScheduledProgression = parsed.some(({ adjustment }) => adjustment.bonusByLevel || adjustment.interval);
      for (const { index } of parsed) {
        if (initiativeOnlySentence(sentences[index]))
          sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      }
      if (hasScheduledProgression) {
        for (const [index, sentence] of sentences.entries()) {
          if (/^(?:This|The) bonus\b[^.]{0,160}\b(?:increases?|improves?)\b/i.test(sentence))
            sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
        }
      }
      const remaining = sentences.filter((sentence, index) =>
        !archetypeReplacementBoilerplate(sentence) &&
        !parsed.some((entry) => entry.index === index) &&
        !(hasScheduledProgression && /\b(?:this|the) bonus\b[^.]{0,100}\b(?:increases?|improves?)\b/i.test(sentence)),
      );
      if (parsed.length && remaining.length === 0) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  return {
    adjustments,
    fullyAutomatedFeatureIds,
    sentenceCoverage: [...new Map(sentenceCoverage.map((entry) => [`${entry.sourceFeatureId}:${entry.sentenceIndex}`, entry])).values()],
  };
}

export function inferArchetypeInitiativeBonusAdjustments(archetype) {
  return inferredArchetypeInitiativeBonusDetails(archetype).adjustments;
}

export function archetypeInitiativeBonusAdjustments(archetype) {
  const explicit = archetype?.conditionalModifiers ?? [];
  const explicitSourceKeys = new Set(explicit.filter((item) => item.sourceFeatureId).map((item) => `${item.sourceFeatureId}:${item.label.toLowerCase()}`));
  const explicitUnscopedLabels = new Set(explicit.filter((item) => !item.sourceFeatureId).map((item) => item.label.toLowerCase()));
  return inferArchetypeInitiativeBonusAdjustments(archetype).filter((item) =>
    !explicitSourceKeys.has(`${item.sourceFeatureId ?? ""}:${item.label.toLowerCase()}`) &&
    !explicitUnscopedLabels.has(item.label.toLowerCase()),
  );
}
