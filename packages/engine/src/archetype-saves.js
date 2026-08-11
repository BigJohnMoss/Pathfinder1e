import {
  archetypeReplacementBoilerplate,
  archetypeRuleProgression,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const allSaveTargets = ["fortitude", "reflex", "will"];

function saveTargets(raw) {
  const clause = String(raw);
  if (/\b(?:all )?saving throws?\b/i.test(clause) && !/\b(?:Fortitude|Reflex|Will)\b/i.test(clause)) return allSaveTargets;
  const targets = allSaveTargets.filter((target) => new RegExp(`\\b${target}\\b`, "i").test(clause));
  return targets.length ? targets : /\bsaves?\b/i.test(clause) ? allSaveTargets : [];
}

const targetPattern = /(?:all\s+)?saving throws?|(?:(?:Fortitude|Reflex|Will)(?:\s*(?:,|and|or)\s*(?:Fortitude|Reflex|Will))*)\s+(?:saving throws?|saves?)|(?:Fortitude|Reflex|Will)\s+saves?/i;

function saveConditionFromSentence(sentence, verbIndex, targetEnd) {
  const prefix = sentence.slice(0, verbIndex);
  const leading = prefix.match(/(?:^(?:At \d+(?:st|nd|rd|th) level,?\s*)?)(When|Whenever|While|During|Within|As long as|If)\s+(.+?),\s*(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z' -]{0,60})\s*$/i);
  if (leading) return `${leading[1].toLowerCase()} ${leading[2]}`;
  const tail = sentence.slice(targetEnd).trim();
  const trailing = tail.match(/^((?:and to (?:his|her|their) CMD )?against|attempted against|made to|to (?:avoid|resist|resolve)|when|whenever|while|during|within|involving|as long as|if)\s+(.+?)(?=,?\s+and (?:an? \+\d|DCs?|the|he|she|they)|,\s+as well as|[.;]|$)/i);
  if (!trailing) return undefined;
  const trigger = /^and to /i.test(trailing[1]) ? "against" : trailing[1].toLowerCase();
  return `${trigger} ${trailing[2]}`;
}

function adjustmentFromSentence(feature, sentence) {
  const bonusPattern = /\b(?:gains?|receives?|has) (?:an? )?\+(\d+) (?:alchemical |circumstance |competence |dodge |enhancement |insight |luck |morale |profane |racial |resistance |sacred |trait |untyped )?bonus (?:on|to) /gi;
  for (const bonus of sentence.matchAll(bonusPattern)) {
    if (archetypeUnsafeSubject(sentence, bonus.index)) continue;
    const rawRest = sentence.slice(bonus.index + bonus[0].length);
    const rest = rawRest.split(/,\s+but\b|;|[.]/i)[0];
    const target = targetPattern.exec(rest);
    if (!target) continue;
    const initialTargets = saveTargets(target[0]);
    if (!initialTargets.length) continue;
    const targetEnd = bonus.index + bonus[0].length + target.index + target[0].length;
    const condition = saveConditionFromSentence(sentence, bonus.index, targetEnd);
    const targets = condition ? saveTargets(rest) : initialTargets;
    return {
      sourceFeatureId: feature.id,
      label: targets.length === 3 ? "Saving throws" : `${targets.map((item) => item[0].toUpperCase() + item.slice(1)).join(" and ")} saves`,
      saveTargets: targets,
      minimumLevel: Number(sentence.slice(0, bonus.index).match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
      base: Number(bonus[1]),
      ...(condition ? { condition } : {}),
    };
  }
  return null;
}

function narrativeLeadSentence(sentence) {
  const withoutLevel = sentence.replace(/^At \d+(?:st|nd|rd|th) level,?\s*/i, "");
  return !/\d|\b(?:armor class|attack|bonus|can|check|damage|DC|feet?|gains?|immune|immunity|level|may|must|penalty|rank|receives?|resistance|roll|round|save|skill|spell|times? per|uses?)\b/i.test(withoutLevel);
}

function directSaveRuleSentence(sentence, parsedCount = 1) {
  const numericBonuses = sentence.match(/\+\d+ (?:(?:alchemical|circumstance|competence|dodge|enhancement|insight|luck|morale|profane|racial|resistance|sacred|trait|untyped) )?bonus(?:es)?\b/gi)?.length ?? 0;
  return numericBonuses === parsedCount &&
    /^(?:(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z'\u2019 -]{0,80})\s+(?:gains?|receives?|has)\b/i.test(sentence) &&
    !/\b(?:can|may|spends?|uses?|becomes? immune|is unaffected)\b/i.test(sentence) &&
    (sentence.match(/\b(?:gains?|receives?|has)\b/gi)?.length ?? 0) === 1;
}

export function inferredArchetypeSaveBonusDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const replacement of archetype?.replacements ?? []) {
    for (const feature of replacement.features ?? []) {
      if (/^(?:Deeds?|Bonus Feats?|Revelations?)$/i.test(feature.name ?? "")) continue;
      if (/\b(?:choose|chooses|chosen|select|selects|selected) (?:one|a|an|from)|\bone of the (?:following|options)|\bfollowing (?:abilities|benefits|options)\b/i.test(feature.summary ?? "")) continue;
      if (/\bcan spend\b[^.]{0,120}\bto gain\b|\b[A-Z][A-Za-z’' -]+ \((?:Ex|Su|Sp)\)\s*:/i.test(feature.summary ?? "")) continue;
      const sentences = archetypeRuleSentences(feature.summary);
      const parsed = sentences.flatMap((sentence, index) => {
        const adjustment = adjustmentFromSentence(feature, sentence);
        return adjustment ? [{ index, adjustment: archetypeRuleProgression(adjustment, feature.summary, /\b(?:saving throws?|saves?)\b/i) }] : [];
      });
      const safeParsed = parsed.filter(({ index, adjustment }) =>
        adjustment.condition ||
        /^(?:At \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they)|(?:an?|the)\s+[a-z])/i.test(sentences[index]),
      );
      const unique = [...new Map(safeParsed.map((entry) => [JSON.stringify(entry.adjustment), entry])).values()];
      adjustments.push(...unique.map(({ adjustment }) => adjustment));
      const hasScheduledProgression = unique.some(({ adjustment }) => adjustment.bonusByLevel || adjustment.interval);
      const firstParsedIndex = unique.length ? Math.min(...unique.map(({ index }) => index)) : -1;
      for (const { index } of unique) {
        if (directSaveRuleSentence(sentences[index]))
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
        !(unique.some((entry) => entry.index === index) && directSaveRuleSentence(sentence)) &&
        !(index < firstParsedIndex && narrativeLeadSentence(sentence)) &&
        !(hasScheduledProgression && /\b(?:this|the) bonus\b[^.]{0,100}\b(?:increases?|improves?)\b/i.test(sentence)),
      );
      if (unique.length && remaining.length === 0) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  return {
    adjustments,
    fullyAutomatedFeatureIds,
    sentenceCoverage: [...new Map(sentenceCoverage.map((entry) => [`${entry.sourceFeatureId}:${entry.sentenceIndex}`, entry])).values()],
  };
}

export function inferArchetypeSaveBonusAdjustments(archetype) {
  return inferredArchetypeSaveBonusDetails(archetype).adjustments;
}

export function archetypeSaveBonusAdjustments(archetype) {
  const explicitSaveRows = (archetype?.conditionalModifiers ?? [])
    .filter((item) => /\bsav(?:e|es|ing throws?)\b/i.test(item.label));
  const explicitSaveFeatureIds = new Set(explicitSaveRows
    .filter((item) => item.sourceFeatureId)
    .map((item) => item.sourceFeatureId));
  const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return inferArchetypeSaveBonusAdjustments(archetype).filter((item) =>
    !explicitSaveFeatureIds.has(item.sourceFeatureId) &&
    !explicitSaveRows.some((explicit) =>
      normalized(explicit.label) === normalized(item.label) &&
      normalized(explicit.condition) === normalized(item.condition)),
  );
}
