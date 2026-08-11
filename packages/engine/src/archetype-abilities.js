import {
  archetypeReplacementBoilerplate,
  archetypeRuleCondition,
  archetypeRuleSentences,
  archetypeUnsafeSubject,
} from "./archetype-initiative.js";

const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const abilityPattern = "Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";
const featureLabel = (feature) => String(feature?.name ?? "Ability scores").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();

function sentenceLevel(feature, sentence, matchIndex) {
  return Number(sentence.slice(0, matchIndex).match(/\b(?:At|Starting at|Beginning at) (\d+)(?:st|nd|rd|th)(?: level)?\b/i)?.[1] ?? feature.level ?? 1);
}

function abilityList(value) {
  const normalized = String(value).replace(/\s*,?\s+and\s+/i, ", ");
  return [...new Set(normalized.split(/\s*,\s*/).map((ability) => ability.trim().toLowerCase()).filter((ability) => abilityNames.includes(ability)))];
}

function adjustmentFromSentence(feature, sentence) {
  const pattern = new RegExp(`\\b(?:gains?|receives?|has) (?:an? )?\\+(\\d+) (?:(alchemical|circumstance|competence|enhancement|inherent|insight|morale|profane|racial|sacred|size|trait|untyped) )?bonus to (?:his|her|their|the)\\s+((?:${abilityPattern})(?:\\s*,\\s*(?:${abilityPattern}))*(?:\\s*,?\\s+and\\s+(?:${abilityPattern}))?)(?: scores?)?\\b`, "i");
  const match = pattern.exec(sentence);
  if (!match) return [];
  const prefix = sentence.slice(Math.max(0, match.index - 160), match.index);
  const explicitPlayerPronoun = /\b(?:he|she|they)\s*$/i.test(prefix);
  if (archetypeUnsafeSubject(sentence, match.index) && !explicitPlayerPronoun) return [];
  if (/\b(?:cohort|follower|familiar|mount|phantom|spirit animal|target)\b/i.test(prefix) && !explicitPlayerPronoun) return [];
  const targets = abilityList(match[3]);
  if (!targets.length) return [];
  const state = new RegExp(`\\b(?:the|an?) [a-z][a-z'\\u2019 -]{0,60}\\s+(?:in|while in) (?:an? )?([^,;.]{1,70})\\s+gains?\\b`, "i").exec(sentence)?.[1];
  const condition = archetypeRuleCondition(sentence, match.index + match[0].length) ?? (state ? `while in ${state}` : undefined);
  return targets.map((ability) => ({
    sourceFeatureId: feature.id,
    label: `${featureLabel(feature)}: ${ability[0].toUpperCase()}${ability.slice(1)}`,
    ability,
    minimumLevel: sentenceLevel(feature, sentence, match.index),
    base: Number(match[1]),
    ...(match[2] ? { bonusType: match[2].toLowerCase() } : {}),
    ...(condition ? { condition } : {}),
  }));
}

function addProgression(adjustment, summary) {
  const initial = { level: adjustment.minimumLevel, bonus: adjustment.base };
  const abilityName = `${adjustment.ability[0].toUpperCase()}${adjustment.ability.slice(1)}`;
  const rageMilestones = adjustment.ability === "constitution"
    ? String(summary).match(/\bConstitution bonus increases? to \+(\d+)[^.]{0,120}\bgreater rage\b[^.]{0,140}\+(\d+) Constitution bonus[^.]{0,120}\bmighty rage\b/i)
    : null;
  if (rageMilestones) return { ...adjustment, bonusByLevel: [initial, { level: 11, bonus: Number(rageMilestones[1]) }, { level: 20, bonus: Number(rageMilestones[2]) }] };
  const targeted = new RegExp(`(?:the )?(?:bonus to )?${abilityName}(?: score)?[^.]{0,80}?increases? to \\+(\\d+)[^.]{0,30}?(?:at|when [^.]{0,30}?at) (\\d+)(?:st|nd|rd|th)(?: level)?`, "gi");
  const targetedSteps = [...String(summary).matchAll(targeted)].map((match) => ({ level: Number(match[2]), bonus: Number(match[1]) }));
  if (targetedSteps.length) return { ...adjustment, bonusByLevel: [initial, ...targetedSteps.filter((step) => step.level > initial.level)] };

  const genericTo = [...String(summary).matchAll(/\b(?:This|The) bonus increases? to \+(\d+) at (\d+)(?:st|nd|rd|th)(?: level)?/gi)]
    .map((match) => ({ level: Number(match[2]), bonus: Number(match[1]) }));
  if (genericTo.length) return { ...adjustment, bonusByLevel: [initial, ...genericTo.filter((step) => step.level > initial.level)] };

  const repeated = String(summary).match(/\b(?:This|The) bonus increases? by (\d+) at (\d+)(?:st|nd|rd|th)(?: level)? and (\d+)(?:st|nd|rd|th)(?: level)?,? to a maximum of \+(\d+)/i);
  if (repeated) {
    const increase = Number(repeated[1]);
    const maximum = Number(repeated[4]);
    let bonus = adjustment.base;
    const steps = [initial];
    for (const level of [Number(repeated[2]), Number(repeated[3])]) {
      bonus = Math.min(maximum, bonus + increase);
      steps.push({ level, bonus });
    }
    return { ...adjustment, maximum, bonusByLevel: steps };
  }
  return adjustment;
}

const progressionSentence = (sentence) => /\b(?:This|The|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) (?:score )?bonus(?:es)?\b[^.]{0,120}\bincreases?\b/i.test(sentence);
const nonMechanicalNarrative = (sentence) => !/\b(?:action|attack|bonus|can|damage|gains?|immune|penalty|receives?|resistance|save|score|spell|uses?)\b/i.test(sentence);
const abilityOnlySentence = (sentence) =>
  (sentence.match(/\+\d+ (?:(?:alchemical|circumstance|competence|enhancement|inherent|insight|morale|profane|racial|sacred|size|trait|untyped) )?bonus\b/gi)?.length ?? 0) === 1 &&
  !/\b(?:AC|Armor Class|action|attack|can|CMB|CMD|damage|immune|immunity|movement|penalty|resistance|saving throws?|skill checks?|speed|spend|uses?)\b/i.test(sentence);

export function inferredArchetypeAbilityScoreDetails(archetype) {
  const adjustments = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const replacement of archetype?.replacements ?? []) for (const feature of replacement.features ?? []) {
    const summary = String(feature.summary ?? "");
    if (/\b(?:one of the following|from the (?:following )?list|chosen from the list|split the bonus|appl(?:y|ies) the full bonus)\b/i.test(summary)) continue;
    if (/\b[A-Z][A-Za-z'\u2019 -]{2,50}\s*(?:\((?:Ex|Su|Sp)\))?\s*:\s*[^.]{0,300}\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/i.test(summary)) continue;
    const sentences = archetypeRuleSentences(summary);
    const parsedIndexes = new Set();
    for (const [index, sentence] of sentences.entries()) {
      const parsed = adjustmentFromSentence(feature, sentence).map((adjustment) => addProgression(adjustment, summary));
      if (!parsed.length) continue;
      parsedIndexes.add(index);
      if (abilityOnlySentence(sentence))
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      adjustments.push(...parsed);
    }
    const featureAdjustments = adjustments.filter((adjustment) => adjustment.sourceFeatureId === feature.id);
    const hasProgression = featureAdjustments.some((adjustment) => adjustment.bonusByLevel);
    if (hasProgression) {
      for (const [index, sentence] of sentences.entries()) {
        if (progressionSentence(sentence))
          sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      }
    }
    const remaining = sentences.filter((sentence, index) =>
      !parsedIndexes.has(index)
      && !archetypeReplacementBoilerplate(sentence)
      && !(hasProgression && progressionSentence(sentence))
      && !nonMechanicalNarrative(sentence));
    if (parsedIndexes.size && remaining.length === 0 && featureAdjustments.some((adjustment) => !adjustment.condition)) fullyAutomatedFeatureIds.add(feature.id);
  }
  const unique = [...new Map(adjustments.map((adjustment) => [JSON.stringify(adjustment), adjustment])).values()];
  return {
    adjustments: unique,
    fullyAutomatedFeatureIds,
    sentenceCoverage: [...new Map(sentenceCoverage.map((entry) => [`${entry.sourceFeatureId}:${entry.sentenceIndex}`, entry])).values()],
  };
}

export function inferArchetypeAbilityScoreAdjustments(archetype) {
  return inferredArchetypeAbilityScoreDetails(archetype).adjustments;
}

export function archetypeAbilityScoreAdjustments(archetype) {
  const explicit = archetype?.abilityScoreAdjustments ?? [];
  if ((archetype?.mechanicalCoverage ?? "partial") === "full") return explicit;
  return [...explicit, ...inferArchetypeAbilityScoreAdjustments(archetype).filter((adjustment) =>
    !explicit.some((row) => row.sourceFeatureId && row.sourceFeatureId === adjustment.sourceFeatureId && row.ability === adjustment.ability),
  )];
}
