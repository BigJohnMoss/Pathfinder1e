import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);
const sentences = (text) => String(text ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const featureLabel = (feature) => String(feature?.name ?? "Archetype feature").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();
const normalizedLabel = (value) => String(value ?? "").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();

function playerOwnedReroll(sentence) {
  if (!/\breroll\b/i.test(sentence) || /\breroll any 1s\b|\breroll (?:as many )?rolls? of \d+\b/i.test(sentence)) return false;
  if (/\broll an additional die\b|\bhas not expended\b/i.test(sentence)) return false;
  if (/\bforce\b[^.]{0,100}\b(?:creature|opponent|target)\b[^.]{0,100}\breroll\b/i.test(sentence)) return false;
  if (/\breduce\b[^.]{0,100}\bbonus\b[^.]{0,100}\breroll\b/i.test(sentence)) return false;
  if (/\b(?:ally|attacker|creature|enemy|opponent|target)\b[^.]{0,100}\b(?:can|may|must)\b[^.]{0,80}\breroll\b/i.test(sentence)) return false;
  return /\b(?:he|she|they|[a-z][a-z'\u2019-]*(?:\s+[a-z][a-z'\u2019-]*){0,3})\s+(?:can|may)\b[^.]{0,180}\breroll\b/i.test(sentence);
}

function rerollLabel(sentence, feature) {
  if (/saving throw|\bsave\b/i.test(sentence)) return "Reroll saving throw";
  if (/attack roll/i.test(sentence)) return "Reroll attack roll";
  if (/stabili[sz]ation check/i.test(sentence)) return "Reroll save or stabilization check";
  const namedSkill = sentence.match(/\b(Heal|Bluff|Diplomacy|Intimidate|Perception|Stealth|Survival|Acrobatics) check\b/i)?.[1];
  if (namedSkill) return `Reroll ${namedSkill} check`;
  if (/skill check/i.test(sentence)) return "Reroll skill check";
  return `Use ${featureLabel(feature)} reroll`;
}

function referencedResource(sentence, resources) {
  const explicit = [
    [/\b(?:spend|expend)\s+(?:one|two|three|four|five|six|\d+)\s+grit points?\b/i, { resourceId: "grit", label: "Grit" }],
    [/\b(?:spend|expend)\s+(?:one|two|three|four|five|six|\d+)\s+(?:(?:uses? of )(?:his|her|their) )?inspiration\b/i, { resourceId: "inspiration", label: "Inspiration" }],
    [/\b(?:spend|expend)\s+(?:one|two|three|four|five|six|\d+)\s+panache points?\b/i, { resourceId: "panache", label: "Panache" }],
    [/\b(?:spend|expend)\s+(?:one|two|three|four|five|six|\d+)\s+rounds? of raging song\b/i, { resourceId: "ragingSongRounds", label: "Raging Song" }],
  ].find(([pattern]) => pattern.test(sentence));
  if (explicit) return explicit[1];
  const referenced = resources
    .filter((resource) => new RegExp(`\\b${normalizedLabel(resource.label).replace(/\s+/g, "\\s+")}\\b`, "i").test(normalizedLabel(sentence)))
    .sort((left, right) => right.label.length - left.label.length)[0];
  if (referenced && /\b(?:spend|expend)\b/i.test(sentence)) return referenced;
  return undefined;
}

function resourceCost(sentence) {
  const match = sentence.match(/(?:spend|expend)\s+(one|two|three|four|five|six|\d+)\b/i);
  return match ? numericValue(match[1]) : 1;
}

export function inferredArchetypeRerollActionDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  const resources = resolvedArchetypeResourceAdjustments(archetype);
  const resourceByFeatureId = new Map(resources.map((resource) => [resource.resourceId.replace(/^archetype-/, ""), resource]));
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length) continue;
    const featureSentences = sentences(feature.summary);
    const sentenceIndex = featureSentences.findIndex(playerOwnedReroll);
    const sentence = featureSentences[sentenceIndex];
    if (!sentence || /damage dice|damage roll|dismiss the fortune|choose to increase (?:his|her|their) number of uses/i.test(String(feature.summary ?? ""))) continue;
    const directResource = resourceByFeatureId.get(feature.id)
      ?? resources.find((resource) => normalizedLabel(resource.label) === normalizedLabel(featureLabel(feature)));
    const referenced = referencedResource(sentence, resources);
    if (/^(?:revelations?|deeds)$/i.test(featureLabel(feature)) && !referenced) continue;
    const resource = referenced ?? directResource;
    if (/\b(?:spend|expend)\b/i.test(sentence) && !resource) continue;
    if (/\b(?:once|twice|\d+ times?) per day\b/i.test(String(feature.summary ?? "")) && !resource) continue;
    const kind = /(?:take|keep) the (?:better|higher) result/i.test(sentence) ? "higher-d20" : "d20";
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-reroll`,
        label: rerollLabel(sentence, feature),
        classId: archetype.classId,
        minimumLevel: Math.max(1, Number(sentence.match(/\b(?:Beginning |Starting )?[Aa]t (\d+)(?:st|nd|rd|th) level\b/)?.[1] ?? feature.level ?? 1)),
        ...(resource ? { resourceId: resource.resourceId, cost: resourceCost(sentence) } : {}),
        rerollAction: { kind, label: "New roll" },
        summary: sentence,
      },
    });
    sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
    featureSentences.forEach((candidate, index) => {
      if (index === sentenceIndex) return;
      if (/\b(?:must|has to) (?:take|accept|keep)\b[^.]{0,100}\bresults?\b/i.test(candidate))
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
      else if (resource && /\b(?:use this ability|uses? this ability|additional time|twice|three times|four times|five times)\b[^.]{0,120}\bper day\b/i.test(candidate))
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: index });
    });
    const remainingRules = featureSentences.filter((candidate) =>
      candidate !== sentence
      && !/\b(?:must|has to) (?:take|accept|keep)\b[^.]{0,100}\bresults?\b/i.test(candidate)
      && !/\bcan use this ability\b[^.]{0,120}\bper day\b/i.test(candidate)
      && !/\bthis ability replaces\b/i.test(candidate));
    if (!remainingRules.length) fullyAutomatedFeatureIds.add(feature.id);
  }
  return {
    actions,
    fullyAutomatedFeatureIds,
    sentenceCoverage: [...new Map(sentenceCoverage.map((entry) => [`${entry.sourceFeatureId}:${entry.sentenceIndex}`, entry])).values()],
  };
}

export function inferArchetypeRerollActions(archetype) {
  return inferredArchetypeRerollActionDetails(archetype).actions;
}
