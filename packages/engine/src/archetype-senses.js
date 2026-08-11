import {
  archetypeReplacementBoilerplate,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const senseDefinitions = [
  ["darkvision", "Darkvision"],
  ["low-light-vision", "Low-light vision"],
  ["scent", "Scent"],
  ["blindsense", "Blindsense"],
  ["blindsight", "Blindsight"],
  ["tremorsense", "Tremorsense"],
];

const sensePattern = /\b(darkvision|low-light vision|blindsense|blindsight|tremorsense|(?<!keen |child-)scent)\b/gi;
const normalizeSense = (value) => String(value).toLowerCase().replace(/\s+/g, "-");
const senseLabel = (sense) => senseDefinitions.find(([id]) => id === sense)?.[1] ?? sense;

const sentenceLevel = (feature, sentence, matchIndex) => Number(
  sentence.slice(0, matchIndex).match(/\b(?:At|A|Starting at|Beginning at) (\d+)(?:st|nd|rd|th)(?: level)?\b/i)?.[1] ?? feature.level ?? 1,
);

function directGrant(sentence, senseMatch) {
  const prefix = sentence.slice(Math.max(0, senseMatch.index - 180), senseMatch.index);
  const verb = [...prefix.matchAll(/\b(?:gains?|receives?|is granted|granting (?:him|her|them))\b/gi)].at(-1);
  if (!verb) return null;
  const absoluteIndex = Math.max(0, senseMatch.index - 180) + verb.index;
  const between = sentence.slice(absoluteIndex + verb[0].length, senseMatch.index);
  if (between.length > 150 || /\b(?:ability to grant|one of|following|choice|choose|select|allies|creatures|targets|checks?|saves?|attacks?)\b|\bbonus (?:on|to)\b/i.test(between)) return null;
  if (archetypeUnsafeSubject(sentence, absoluteIndex)) return null;
  if (/\b(?:did|does?|do) not\s*$/i.test(sentence.slice(Math.max(0, absoluteIndex - 20), absoluteIndex))) return null;
  if (/\b(?:clockwork spy|construct|homunculus|weapon)\s*$/i.test(sentence.slice(Math.max(0, absoluteIndex - 80), absoluteIndex))) return null;
  if (/\bweapon\b[^.]{0,120}\bit\s*$/i.test(sentence.slice(Math.max(0, absoluteIndex - 160), absoluteIndex))) return null;
  return { index: absoluteIndex, end: senseMatch.index + senseMatch[0].length };
}

function rangeNearSense(sentence, match) {
  const before = sentence.slice(Math.max(0, match.index - 25), match.index);
  const after = sentence.slice(match.index + match[0].length, match.index + match[0].length + 70);
  return Number(
    before.match(/(\d+)[ -]foot(?:-range)?\s*$/i)?.[1] ??
    after.match(/^(?:\s+(?:with|to|out to))?(?:\s+(?:a )?(?:range|distance) of)?\s+(\d+)\s*(?:feet|ft\.?)/i)?.[1] ??
    after.match(/^\s+(?:ability\s+)?within\s+(\d+)\s*(?:feet|ft\.?)/i)?.[1] ??
    after.match(/^\s+(?:in|within)\s+(?:a\s+)?(\d+)[ -]foot (?:radius|range)/i)?.[1] ??
    0,
  ) || undefined;
}

function conditionFor(sentence, grant) {
  const prefix = sentence.slice(0, grant.index).replace(/^(?:At|Starting at|Beginning at) \d+(?:st|nd|rd|th) level,?\s*/i, "");
  const leading = prefix.match(/\b(while|when|whenever|during|if|as long as)\s+(.+?),\s*(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z'’ -]{0,70})\s*$/i);
  if (leading) return `${leading[1].toLowerCase()} ${leading[2]}`;
  const contextual = sentence.match(/^(?:(?:At|Starting at|Beginning at) \d+(?:st|nd|rd|th) level,?\s*)?(While|When|Whenever|During|If|As long as)\s+(.+?),/i);
  if (contextual && grant.index > contextual.index + contextual[0].length) return `${contextual[1].toLowerCase()} ${contextual[2]}`;
  const trailing = sentence.slice(grant.end).match(/^\s*(?:ability\s+)?(?:(?:(?:with|to|out to)?\s*(?:a )?(?:range|distance) of\s+)?\d+\s*(?:feet|ft\.?)\s*)?(while|when|whenever|during|if|as long as|but only (?:against|while|when))\s+(.+?)(?=;|[.]|$)/i);
  if (trailing) return `${trailing[1].toLowerCase()} ${trailing[2]}`;
  const restricted = sentence.slice(grant.end).match(/^(?:\s+special ability)?\s*,?\s*but with regard only to\s+(.+?)(?=;|[.]|$)/i);
  if (restricted) return `only for ${restricted[1]}`;
  const only = sentence.slice(grant.end).match(/\b(?:but )?only (while|against|when|for)\s+(.+?)(?=;|[.]|$)/i);
  if (only) return `only ${only[1].toLowerCase()} ${only[2]}`;
  const spent = sentence.slice(0, grant.index).match(/\b(?:as an? (standard|move|swift|immediate|free|full-round) action,?\s*)?[^.]{0,80}?can spend (\d+) ([a-z -]+? points?)\s+to\s*$/i);
  const duration = sentence.slice(grant.end).match(/\b(until .+?|for \d+ (?:rounds?|minutes?|hours?)(?: per level)?)(?=;|[.]|$)/i);
  const action = sentence.slice(0, grant.index).match(/\bas an? (standard|move|swift|immediate|free|full-round) action\b/i)?.[1];
  if (spent) return `after spending ${spent[2]} ${spent[3]}${action ? ` as a ${action} action` : ""}${duration ? `, ${duration[1]}` : ""}`;
  return undefined;
}

function rangeProgression(adjustment, summary) {
  if (!adjustment.range) return adjustment;
  const sentences = archetypeRuleSentences(summary);
  const milestones = sentences.flatMap((sentence) => {
    if (!new RegExp(adjustment.sense.replaceAll("-", "[- ]"), "i").test(sentence)) return [];
    const match = sentence.match(/\bAt (\d+)(?:st|nd|rd|th) level[^.]{0,100}?\brange\b[^.]{0,80}?\bincreases? to (\d+) feet\b/i);
    return match ? [{ level: Number(match[1]), range: Number(match[2]) }] : [];
  }).filter((step) => step.level >= adjustment.minimumLevel);
  if (milestones.length) return { ...adjustment, rangeByLevel: [{ level: adjustment.minimumLevel, range: adjustment.range }, ...milestones.filter((step) => step.level > adjustment.minimumLevel)] };
  const candidates = sentences.filter((sentence) =>
    new RegExp(adjustment.sense.replaceAll("-", "[- ]"), "i").test(sentence) &&
    /\brange\b[^.]{0,80}\bincreases? by \d+ feet\b/i.test(sentence),
  );
  const relevant = candidates.find((sentence) => /\bevery \d+ [^.]{0,30}?levels? thereafter\b/i.test(sentence)) ?? candidates[0];
  if (!relevant) return adjustment;
  const increase = Number(relevant.match(/\brange\b[^.]{0,80}\bincreases? by (\d+) feet\b/i)?.[1] ?? 0);
  const recurring = relevant.match(/(?:(?:At )|(?:When [^.]{0,40}?reaches? ))?(\d+)(?:st|nd|rd|th) level,?\s*(?:and )?every (\d+) [^.]{0,30}?levels? thereafter/i) ??
    relevant.match(/at (\d+)(?:st|nd|rd|th) level(?:,? and| and) every (\d+) [^.]{0,30}?levels?/i);
  if (!increase || !recurring) return adjustment;
  const interval = Number(recurring[2]);
  let range = adjustment.range;
  let level = Number(recurring[1]);
  if (level < adjustment.minimumLevel) level = adjustment.minimumLevel + interval;
  if (level === adjustment.minimumLevel) {
    range += increase;
    level += interval;
  }
  const rangeByLevel = [{ level: adjustment.minimumLevel, range }];
  for (; level <= 20; level += interval) {
    range += increase;
    rangeByLevel.push({ level, range });
  }
  return { ...adjustment, rangeByLevel };
}

function sentenceAdjustments(feature, sentence) {
  if (/\b(?:spell list|spells? known|formulae|formula book|rage powers? complement|following (?:rage powers?|discoveries|options)|special qualities)\b/i.test(sentence)) return [];
  const senseMatches = [...sentence.matchAll(sensePattern)];
  let grants = senseMatches.flatMap((match) => {
    const grant = directGrant(sentence, match);
    if (!grant) return [];
    const sense = normalizeSense(match[1]);
    const range = rangeNearSense(sentence, match);
    const condition = conditionFor(sentence, grant);
    return [{
      sourceFeatureId: feature.id,
      sense,
      label: senseLabel(sense),
      operation: "grant",
      minimumLevel: sentenceLevel(feature, sentence, match.index),
      ...(range ? { range } : {}),
      ...(condition ? { condition } : {}),
    }];
  });
  const sharedCondition = grants.findLast((adjustment) => adjustment.condition)?.condition;
  if (sharedCondition) grants = grants.map((adjustment) => adjustment.condition ? adjustment : { ...adjustment, condition: sharedCondition });
  const increases = senseMatches.flatMap((match) => {
    const prefix = sentence.slice(0, match.index);
    const subject = prefix.match(/\bif\s+([^,]{0,80}?)\balready has\s*$/i)?.[1]?.trim() ?? "";
    if (!subject || /\b(?:ally|allies|companion|creature|eidolon|familiar|homunculus|mount|target)\b/i.test(subject)) return [];
    const after = sentence.slice(match.index + match[0].length);
    const amount = Number(after.match(/[^.]{0,80}?\brange\b[^.]{0,50}?\b(?:increases?|is increased) by (\d+) feet\b/i)?.[1] ?? 0);
    if (!amount) return [];
    const sense = normalizeSense(match[1]);
    return [{
      sourceFeatureId: feature.id,
      sense,
      label: senseLabel(sense),
      operation: "increase",
      minimumLevel: sentenceLevel(feature, sentence, match.index),
      range: amount,
      condition: `if already has ${senseLabel(sense).toLowerCase()}`,
    }];
  });
  return [...grants, ...increases];
}

const narrativeSentence = (sentence) => !/\b(?:gains?|receives?|has|granted|darkvision|low-light vision|scent|blindsense|blindsight|tremorsense|level|can|may|must|bonus|penalty|immune|resistance|speed|spell|attack|damage|save|skill|action)\b/i.test(sentence);
const senseOnlySentence = (sentence) => !/\b(?:bonus (?:feat|on|to)|penalty|immun(?:e|ity)|resistance|damage reduction|type changes|loses?|spell resistance|natural attack|speed)\b/i.test(sentence);

export function inferredArchetypeSenseDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const replacement of archetype?.replacements ?? []) {
    for (const feature of replacement.features ?? []) {
      if (/\b(?:must choose|of (?:his|her|their) choice|from the list below|one of the following|following (?:discoveries|options|abilities|flourishes))\b/i.test(feature.summary ?? "")) continue;
      if (/\b(?:detailed below|list of potential|selecting one from)\b/i.test(feature.summary ?? "")) continue;
      if (/\b(?:animal companion|eidolon|familiar|homunculus|mount)\b/i.test(feature.name ?? "")) continue;
      if (/\b[A-Z][A-Za-z'’ -]{2,50}\s*(?:\((?:Ex|Su|Sp)\))?\s*:\s*[^.]{0,300}\b(?:darkvision|low-light vision|scent|blindsense|blindsight|tremorsense)\b/i.test(feature.summary ?? "")) continue;
      const sentences = archetypeRuleSentences(feature.summary);
      const parsedIndexes = new Set();
      for (const [index, sentence] of sentences.entries()) {
        let parsed = sentenceAdjustments(feature, sentence).map((adjustment) => rangeProgression(adjustment, feature.summary));
        const sharedFeatureCondition = String(feature.summary ?? "").match(/\b(?:gains?|receives?) additional abilities (when|while|during)\s+(.+?)(?=;|[.])/i);
        if (sharedFeatureCondition) parsed = parsed.map((adjustment) => adjustment.condition ? adjustment : { ...adjustment, condition: `${sharedFeatureCondition[1].toLowerCase()} ${sharedFeatureCondition[2]}` });
        else if (/\b(?:can spend|for \d+ (?:rounds?|minutes?|hours?)|until|uses? this ability|activates?|assumes? a form|mutagen|rage|raging song|symbiosis|wild shape)\b/i.test(sentence))
          parsed = parsed.map((adjustment) => adjustment.condition ? adjustment : { ...adjustment, condition: "when this feature is active" });
        if (parsed.length) {
          parsedIndexes.add(index);
          if (senseOnlySentence(sentence))
            sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
        }
        adjustments.push(...parsed);
      }
      if (adjustments.some((adjustment) => adjustment.sourceFeatureId === feature.id && adjustment.rangeByLevel)) {
        for (const [index, sentence] of sentences.entries()) {
          if (/\brange\b[^.]{0,80}\bincreases? by \d+ feet\b/i.test(sentence) && senseOnlySentence(sentence))
            sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
        }
      }
      const remaining = sentences.filter((sentence, index) =>
        !(parsedIndexes.has(index) && senseOnlySentence(sentence)) &&
        !archetypeReplacementBoilerplate(sentence) &&
        !narrativeSentence(sentence) &&
        !/\brange\b[^.]{0,80}\bincreases? by \d+ feet\b/i.test(sentence),
      );
      if (parsedIndexes.size && remaining.length === 0) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  const unique = [...adjustments.reduce((rows, adjustment) => {
    const key = JSON.stringify({
      sourceFeatureId: adjustment.sourceFeatureId,
      sense: adjustment.sense,
      operation: adjustment.operation,
      minimumLevel: adjustment.minimumLevel,
      condition: adjustment.condition,
    });
    const existing = rows.get(key);
    if (!existing || (!existing.range && adjustment.range) || (!existing.rangeByLevel && adjustment.rangeByLevel)) rows.set(key, adjustment);
    return rows;
  }, new Map()).values()];
  return {
    adjustments: unique,
    fullyAutomatedFeatureIds,
    sentenceCoverage: [...new Map(sentenceCoverage.map((entry) => [`${entry.sourceFeatureId}:${entry.sentenceIndex}`, entry])).values()],
  };
}

export function inferArchetypeSenseAdjustments(archetype) {
  return inferredArchetypeSenseDetails(archetype).adjustments;
}

export function archetypeSenseAdjustments(archetype) {
  if ((archetype?.mechanicalCoverage ?? "partial") === "full") return [];
  return inferArchetypeSenseAdjustments(archetype);
}
