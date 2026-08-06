import {
  archetypeReplacementBoilerplate,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const featureLabel = (feature) => String(feature.name ?? "Land speed").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "");
const sentenceLevel = (feature, sentence, matchIndex) => Number(
  sentence.slice(0, matchIndex).match(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th)(?: level)?\b/i)?.[1] ?? feature.level ?? 1,
);

function speedRule(sentence) {
  const patterns = [
    /\b(?:gains?|receives?)[^.;]{0,100}?(?:an? )?\+(\d+)(?:[ -]foot)?(?:\s+(enhancement|insight|racial|untyped))? bonus to (?:his|her|their|the)?\s*(?:base land|base|land) speed\b/i,
    /\b(?:(?:his|her|their|the|your)|(?:an?|the)\s+[a-z][a-z'’ -]{0,50}?['’]s)\s+(?:base land|base|land) speed increases? by (\d+) feet\b/i,
    /\bincreases? (?:his|her|their|the|your)\s+(?:base land|base|land) speed by (\d+) feet\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(sentence);
    if (!match || archetypeUnsafeSubject(sentence, match.index)) continue;
    const prefix = sentence.slice(Math.max(0, match.index - 140), match.index);
    if (/\b(?:animal companion|allied mounts?|creatures?|eidolons?|familiars?|mounts?|targets?)\b/i.test(prefix)) continue;
    if (/\b(?:does?|do|did) not\b[^.]{0,100}\b(?:gain|increase)\b/i.test(sentence) || /\bnew mode of movement\b/i.test(sentence)) continue;
    return { match, bonus: Number(match[1]), bonusType: match[2]?.toLowerCase() };
  }
  return null;
}

function conditionFor(sentence, matchEnd) {
  const prefix = sentence.slice(0, matchEnd);
  const leading = prefix.match(/\b(while|when|whenever|during|if|as long as)\s+(.+?),\s*(?:(?:he|she|they)|(?:an?|the)\s+[a-z][a-z'’ -]{0,70})[^.]*$/i);
  if (leading) return `${leading[1].toLowerCase()} ${leading[2]}`;
  const after = sentence.slice(matchEnd);
  const only = after.match(/\b(?:but )?only (?:while|when|in|within|during)\s+(.+?)(?=;|[.]|$)/i);
  if (only) return only[0].replace(/^but\s+/i, "").toLowerCase();
  const terrain = after.match(/^\s+in\s+(.+?)(?=;|[.]|$)/i);
  if (terrain) return `in ${terrain[1]}`;
  if (/\b(?:can spend|for \d+ (?:rounds?|minutes?|hours?)|until the end|bardic performance|raging song|mutagen|bloodrage|polymorph)\b/i.test(sentence)) return "when this feature is active";
  return undefined;
}

function equipmentLimits(summary) {
  const text = String(summary ?? "");
  const result = {};
  if (/\b(?:loses?|does not gain|appl(?:y|ies) only)[^.]{0,120}\bmedium or heavy armor\b/i.test(text)) result.armorCategories = ["none", "light"];
  else if (/\bappl(?:y|ies) only[^.]{0,100}\bno armor, light armor, or medium armor\b/i.test(text)) result.armorCategories = ["none", "light", "medium"];
  if (/\b(?:loses?|does not gain)[^.]{0,120}\bmedium or heavy load\b/i.test(text)) result.prohibitedLoads = ["medium", "heavy", "overloaded"];
  else if (/\bnot carrying a heavy load\b/i.test(text)) result.prohibitedLoads = ["heavy", "overloaded"];
  return result;
}

function progression(adjustment, summary) {
  const text = String(summary ?? "");
  const explicit = [...text.matchAll(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th) level[^.]{0,140}?(?:bonus to (?:his|her|their|the)?\s*(?:base land|base|land) speed|enhancement bonus to (?:his|her|their|the)?\s*(?:base land|base|land) speed)[^.]{0,40}?increases? to \+(\d+) feet\b/gi)]
    .map((match) => ({ level: Number(match[1]), bonus: Number(match[2]) }));
  const compact = [...text.matchAll(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th) level[^.]{0,100}?(?:base land|base|land) speed increases? to \+?(\d+) feet\b/gi)]
    .map((match) => ({ level: Number(match[1]), bonus: Number(match[2]) }));
  const milestones = [...new Map([...explicit, ...compact]
    .filter((step) => step.level > adjustment.minimumLevel)
    .map((step) => [step.level, step])).values()];
  if (milestones.length) return { ...adjustment, bonusByLevel: [{ level: adjustment.minimumLevel, bonus: adjustment.bonus }, ...milestones.sort((left, right) => left.level - right.level)] };

  const recurringGrant = text.match(/\bAt (\d+)(?:st|nd|rd|th) level and every (\d+) levels? thereafter[^.]{0,100}?\+(\d+)[ -]foot[^.]{0,50}?bonus[^.]{0,80}?maximum of \+(\d+) feet/i);
  const recurringIncrease = text.match(/\bAt (\d+)(?:st|nd|rd|th) level(?:,? and| and) every (\d+) levels? thereafter[^.]{0,100}?(?:base land|base|land) speed increases? by (\d+) feet/i);
  const recurring = recurringGrant ?? recurringIncrease;
  if (recurring) {
    const start = Number(recurring[1]);
    const interval = Number(recurring[2]);
    const increment = Number(recurring[3]);
    const maximum = recurringGrant ? Number(recurringGrant[4]) : Number.POSITIVE_INFINITY;
    const rows = [];
    let bonus = recurringIncrease && start === adjustment.minimumLevel ? 0 : adjustment.bonus - increment;
    for (let level = start; level <= 20; level += interval) {
      bonus = Math.min(maximum, bonus + increment);
      rows.push({ level, bonus });
      if (bonus === maximum) break;
    }
    return { ...adjustment, bonusByLevel: rows };
  }

  const increaseLevels = [...text.matchAll(/\bAt (\d+)(?:st|nd|rd|th)(?: and (\d+)(?:st|nd|rd|th))? levels?[^.]{0,100}?bonus to (?:his|her|their|the)?\s*(?:base land|base|land) speed increases? by (\d+) feet/gi)];
  if (increaseLevels.length) {
    let bonus = adjustment.bonus;
    const rows = [{ level: adjustment.minimumLevel, bonus }];
    for (const match of increaseLevels) for (const level of [Number(match[1]), Number(match[2])].filter(Boolean)) {
      bonus += Number(match[3]);
      rows.push({ level, bonus });
    }
    return { ...adjustment, bonusByLevel: rows.sort((left, right) => left.level - right.level) };
  }
  return adjustment;
}

const ruleIsEntireFeature = (feature, parsedSentenceIndexes, sentences) => sentences.every((sentence, index) =>
  parsedSentenceIndexes.has(index) ||
  archetypeReplacementBoilerplate(sentence) ||
  /^This is an? (?:enhancement|insight|racial|untyped) bonus[.]?$/i.test(sentence) ||
  (!/\d|\b(?:can|gains?|receives?|bonus|penalty|increases?|decreases?|level|armor|load|action|spell|attack|damage|save|skill)\b/i.test(sentence)),
);

export function inferredArchetypeLandSpeedDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const replacement of archetype?.replacements ?? []) for (const feature of replacement.features ?? []) {
    const summary = String(feature.summary ?? "");
    if (/\b(?:one of the following|from the (?:following )?list|selects? (?:one|an?|from)|roll \d+d?\d* to determine|following (?:types of )?(?:deeds|bardic performances|performances|revelations|abilities|benefits))\b/i.test(summary)) continue;
    if (/\b[A-Z][A-Za-z'’ -]{2,50}\s*(?:\((?:Ex|Su|Sp)\))?\s*:\s*[^.]{0,350}\b(?:base land|base|land) speed\b/i.test(summary)) continue;
    const sentences = archetypeRuleSentences(summary);
    const parsedSentenceIndexes = new Set();
    let primaryAdjustmentAdded = false;
    for (const [index, sentence] of sentences.entries()) {
      const rule = speedRule(sentence);
      if (!rule) continue;
      if (primaryAdjustmentAdded && /\b(?:bonus[^.]{0,100}?increases?|range[^.]{0,100}?increases?)\b/i.test(sentence)) {
        parsedSentenceIndexes.add(index);
        continue;
      }
      const condition = conditionFor(sentence, rule.match.index + rule.match[0].length) ??
        (/(?:gains?|receives?) additional abilities when\s+(.+?)(?=;|[.])/i.test(summary) ? `when ${summary.match(/(?:gains?|receives?) additional abilities when\s+(.+?)(?=;|[.])/i)[1]}` : undefined) ??
        (/\bwhen (?:taking|assuming|using|in)\s+([^.,;]{1,80}?\bform)\b/i.test(summary) ? `when ${summary.match(/\bwhen (?:taking|assuming|using|in)\s+([^.,;]{1,80}?\bform)\b/i)[1]} is active` : undefined);
      parsedSentenceIndexes.add(index);
      adjustments.push(progression({
        sourceFeatureId: feature.id,
        label: featureLabel(feature),
        minimumLevel: sentenceLevel(feature, sentence, rule.match.index),
        bonus: rule.bonus,
        timing: "beforeReduction",
        ...((rule.bonusType ?? summary.match(/\bThis is an? (enhancement|insight|racial|untyped) bonus\b/i)?.[1]?.toLowerCase()) ? { bonusType: rule.bonusType ?? summary.match(/\bThis is an? (enhancement|insight|racial|untyped) bonus\b/i)[1].toLowerCase() } : {}),
        ...equipmentLimits(summary),
        ...(condition ? { condition } : {}),
      }, summary));
      primaryAdjustmentAdded = true;
    }
    if (parsedSentenceIndexes.size && ruleIsEntireFeature(feature, parsedSentenceIndexes, sentences)) fullyAutomatedFeatureIds.add(feature.id);
  }
  const unique = [...new Map(adjustments.map((adjustment) => [JSON.stringify(adjustment), adjustment])).values()];
  return { adjustments: unique, fullyAutomatedFeatureIds };
}

export function inferArchetypeLandSpeedAdjustments(archetype) {
  return inferredArchetypeLandSpeedDetails(archetype).adjustments;
}

export function archetypeLandSpeedAdjustments(archetype) {
  const explicit = archetype?.landSpeedAdjustments ?? [];
  if ((archetype?.mechanicalCoverage ?? "partial") === "full") return explicit;
  return [...explicit, ...inferArchetypeLandSpeedAdjustments(archetype).filter((adjustment) =>
    !explicit.some((row) => row.sourceFeatureId && row.sourceFeatureId === adjustment.sourceFeatureId),
  )];
}
