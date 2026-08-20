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

const targetPattern = /(?:all\s+)?saving throws?|(?:all\s+)?saves?|(?:(?:Fortitude|Reflex|Will)(?:\s*(?:,|and|or)\s*(?:Fortitude|Reflex|Will))*)\s+(?:saving throws?|saves?)|(?:Fortitude|Reflex|Will)\s+saves?/i;

function saveConditionFromSentence(sentence, verbIndex, targetEnd) {
  const prefix = sentence.slice(0, verbIndex);
  const leading = prefix.match(/(?:^(?:At \d+(?:st|nd|rd|th) level,?\s*)?)(When|Whenever|While|During|Within|As long as|If)\s+(.+?),\s*(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z' -]{0,60})\s*$/i);
  if (leading) return `${leading[1].toLowerCase()} ${leading[2]}`;
  const tail = sentence.slice(targetEnd).trim();
  const trailing = tail.match(/^((?:and to (?:his|her|their) CMD )?against|attempted against|caused by|made to|to (?:avoid|resist|resolve)|when|whenever|while|during|within|involving|as long as|if)\s+(.+?)(?=,?\s+and (?:an? \+\d|DCs?|(?:(?:he|she|they)|the [a-z][a-z' -]{0,60}) (?:gains?|receives?|has|can|may))|,\s+as well as|[.;]|$)/i);
  if (!trailing) return undefined;
  const trigger = /^and to /i.test(trailing[1]) ? "against" : trailing[1].toLowerCase();
  return `${trigger} ${trailing[2]}`.trim();
}

function adjustmentsFromSentence(feature, sentence) {
  const adjustments = [];
  const bonusPattern = /\b(?:(?:gains?|receives?|has) (?:an? )?|(?:and|plus|as well as) (?:an? )?|(?:gaining|granting (?:him|her|them)) (?:an? )?)\+(\d+) (?:alchemical |circumstance |competence |dodge |enhancement |insight |luck |morale |profane |racial |resistance |sacred |trait |untyped )?bonus (?:on|to) /gi;
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
    adjustments.push({
      sourceFeatureId: feature.id,
      label: targets.length === 3 ? "Saving throws" : `${targets.map((item) => item[0].toUpperCase() + item.slice(1)).join(" and ")} saves`,
      saveTargets: targets,
      minimumLevel: Number(sentence.slice(0, bonus.index).match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
      base: Number(bonus[1]),
      ...(condition ? { condition } : {}),
    });
  }
  const levelPattern = /\b(?:adds?|gains?|receives?) (?:his|her|their) (?:class )?level (?:as a bonus )?(?:on|to) /gi;
  for (const bonus of sentence.matchAll(levelPattern)) {
    if (archetypeUnsafeSubject(sentence, bonus.index)) continue;
    const rawRest = sentence.slice(bonus.index + bonus[0].length);
    const rest = rawRest.split(/,\s+but\b|;|[.]/i)[0];
    const target = targetPattern.exec(rest);
    if (!target) continue;
    const targets = saveTargets(target[0]);
    if (!targets.length) continue;
    const targetEnd = bonus.index + bonus[0].length + target.index + target[0].length;
    const condition = saveConditionFromSentence(sentence, bonus.index, targetEnd);
    adjustments.push({
      sourceFeatureId: feature.id,
      label: targets.length === 3 ? "Saving throws" : `${targets.map((item) => item[0].toUpperCase() + item.slice(1)).join(" and ")} saves`,
      saveTargets: targets,
      minimumLevel: Number(sentence.slice(0, bonus.index).match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1),
      base: 0,
      levelMultiplier: 1,
      ...(condition ? { condition } : {}),
    });
  }
  return adjustments;
}

function referencedAdjustmentFromSentence(feature, sentence, source) {
  const reference = /^(?:(?:This|The) bonus also applies|(?:(?:He|She|They)|(?:The|An?) [a-z][a-z'\u2019 -]{0,80}) also (?:receives?|applies?) (?:this|the) bonus)\b/i.exec(sentence);
  if (!reference) return null;
  const target = targetPattern.exec(sentence);
  const targets = target ? saveTargets(target[0]) : source.saveTargets;
  if (!targets?.length) return null;
  const targetEnd = target ? target.index + target[0].length : reference[0].length;
  const condition = saveConditionFromSentence(sentence, reference.index, targetEnd) ??
    sentence.slice(targetEnd).trim().match(/^(against|to (?:avoid|resist|resolve)|when|whenever|while|during|within|if)\s+(.+?)[.]?$/i)?.slice(1).join(" ").trim().toLowerCase();
  if (!condition) return null;
  return {
    ...source,
    sourceFeatureId: feature.id,
    label: targets.length === 3 ? "Saving throws" : `${targets.map((item) => item[0].toUpperCase() + item.slice(1)).join(" and ")} saves`,
    saveTargets: targets,
    condition,
  };
}

function narrativeLeadSentence(sentence) {
  const withoutLevel = sentence.replace(/^At \d+(?:st|nd|rd|th) level,?\s*/i, "");
  return !/\d|\b(?:armor class|attack|bonus|can|check|damage|DC|feet?|gains?|immune|immunity|level|may|must|penalty|rank|receives?|resistance|roll|round|save|skill|spell|times? per|uses?)\b/i.test(withoutLevel);
}

function directSaveRuleSentence(sentence, parsedCount = 1) {
  const numericBonuses = sentence.match(/\+\d+ (?:(?:alchemical|circumstance|competence|dodge|enhancement|insight|luck|morale|profane|racial|resistance|sacred|trait|untyped) )?bonus(?:es)?\b/gi)?.length ?? 0;
  const levelBonuses = sentence.match(/\b(?:adds?|gains?|receives?) (?:his|her|their) (?:class )?level (?:as a bonus )?(?:on|to)\b/gi)?.length ?? 0;
  const directSubject = /^(?:(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:When|Whenever|While|During|Within|As long as|If)\s+[^,]{1,180},\s*)?(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z'\u2019 -]{0,80})\s+(?:gains?|receives?|has|adds?)\b/i.test(sentence);
  const participialSubject = /^(?:(?:At|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z'\u2019 -]{0,100})\s+[^.;]{0,220},\s*(?:gaining|granting (?:him|her|them)) (?:an? )?\+\d+\b/i.test(sentence);
  const ruleVerbCount = sentence.match(/\b(?:gains?|receives?|has|adds?|gaining|granting)\b/gi)?.length ?? 0;
  const conditionHas = /\b(?:When|Whenever|While|During|Within|As long as|If)\s+(?:he|she|they) has\b[^,.;]{0,180},/i.test(sentence) ||
    /\b(?:against|when|whenever|while|during|within|if)\s+[^.;]{1,260}\b(?:he|she|they) has\b/i.test(sentence);
  return numericBonuses + levelBonuses === parsedCount &&
    (directSubject || participialSubject) &&
    !/\b(?:can|may|spends?|uses?|becomes? immune|is unaffected)\b/i.test(sentence) &&
    ruleVerbCount - (conditionHas ? 1 : 0) === 1;
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
      const parsed = sentences.flatMap((sentence, index) =>
        adjustmentsFromSentence(feature, sentence).map((adjustment) => ({
          index,
          adjustment: archetypeRuleProgression(adjustment, feature.summary, /\b(?:saving throws?|saves?)\b/i),
        })),
      );
      const safeParsed = parsed.filter(({ index, adjustment }) =>
        adjustment.condition ||
        /^(?:At \d+(?:st|nd|rd|th) level,?\s*)?(?:(?:he|she|they)|(?:an?|the)\s+[a-z])/i.test(sentences[index]),
      );
      const directUnique = [...new Map(safeParsed.map((entry) => [JSON.stringify(entry.adjustment), entry])).values()];
      const references = directUnique.length === 1 ? sentences.flatMap((sentence, index) => {
        if (directUnique.some((entry) => entry.index === index)) return [];
        const adjustment = referencedAdjustmentFromSentence(feature, sentence, directUnique[0].adjustment);
        return adjustment ? [{ index, adjustment, referenced: true }] : [];
      }) : [];
      const unique = [...new Map([...directUnique, ...references].map((entry) => [JSON.stringify(entry.adjustment), entry])).values()];
      adjustments.push(...unique.map(({ adjustment }) => adjustment));
      const hasScheduledProgression = unique.some(({ adjustment }) => adjustment.bonusByLevel || adjustment.interval);
      const firstParsedIndex = unique.length ? Math.min(...unique.map(({ index }) => index)) : -1;
      const parsedBySentence = new Map();
      const referenceIndexes = new Set(references.map(({ index }) => index));
      for (const { index, referenced } of unique) if (!referenced) parsedBySentence.set(index, (parsedBySentence.get(index) ?? 0) + 1);
      for (const [index, count] of parsedBySentence) {
        if (directSaveRuleSentence(sentences[index], count))
          sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      }
      for (const index of referenceIndexes) sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      if (hasScheduledProgression) {
        for (const [index, sentence] of sentences.entries()) {
          if (/^(?:(?:This|The) bonus\b[^.]{0,160}\b(?:increases?|improves?)\b|This increases? to \+?\d+\b)/i.test(sentence))
            sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
        }
      }
      const remaining = sentences.filter((sentence, index) =>
        !archetypeReplacementBoilerplate(sentence) &&
        !(parsedBySentence.has(index) && directSaveRuleSentence(sentence, parsedBySentence.get(index))) &&
        !referenceIndexes.has(index) &&
        !(index < firstParsedIndex && narrativeLeadSentence(sentence)) &&
        !(hasScheduledProgression && /^(?:(?:This|The) bonus\b[^.]{0,160}\b(?:increases?|improves?)\b|This increases? to \+?\d+\b)/i.test(sentence)),
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
