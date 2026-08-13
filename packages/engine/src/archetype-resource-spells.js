import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);
const containerFeature = /^(?:abilities|ability descriptions|deeds|forbidden powers|revelations|special)$/i;

const spellId = (name) => name
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\u2018\u2019']/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();

const cleanSpellName = (value) => String(value ?? "")
  .replace(/\([^)]*(?:RPG|page|p\.|Adventures|Guide|Intrigue|Magic)[^)]*\)/gi, "")
  .replace(/(?:ACG|APG|ARG|HA|OA|OC|UI|UM|UW)\b/g, "")
  .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")
  .replace(/\s+/g, " ")
  .trim();

function spellNames(raw) {
  return cleanSpellName(raw).split(/\s*(?:,|\bor\b|\band\b)\s*/i)
    .map(cleanSpellName)
    .filter((name) => name && name.length <= 80 && name.split(/\s+/).length <= 8 && !/\b(?:ability|effect|following|power|spell slot|spells?)\b/i.test(name));
}

function resourceReference(sentence) {
  const patterns = [
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+rounds? of (?:his|her|their)?\s*bardic performance\b/i, "bardicPerformance"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+rounds? of (?:his|her|their)?\s*raging song\b/i, "ragingSongRounds"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:uses? of )?(?:his|her|their)?\s*inspiration\b/i, "inspiration"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+grit points?\b/i, "grit"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+panache points?\b/i, "panache"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?arcane pool\b/i, "arcanePool"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? from (?:his|her|their) ki pool|ki points?)\b/i, "kiPool"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?phrenic pool\b/i, "phrenicPool"],
    [/\b(?:spend|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+uses? of (?:his|her|their)?\s*fervor\b/i, "fervor"],
  ];
  for (const [pattern, resourceId] of patterns) {
    const match = sentence.match(pattern);
    if (match) return { resourceId, cost: numericValue(match[1]) };
  }
  return undefined;
}

function parsedSpells(sentence) {
  const found = [];
  for (const match of sentence.matchAll(/\b(?:to|can|may)\s+(?:cast|use)\s+(.{1,120}?)\s+as (?:a )?spell[- ]?like abilit(?:y|ies)\b/gi)) found.push(...spellNames(match[1]));
  for (const match of sentence.matchAll(/\bas if (?:he|she|they|the [a-z'\u2019 -]+)?\s*(?:had )?(?:cast|using)\s+(.{1,100}?)(?=[,.;]|$)/gi)) found.push(...spellNames(match[1]));
  return [...new Set(found.map((name) => name.toLowerCase()))];
}

export function inferredArchetypeResourceSpellActionDetails(archetype) {
  const actions = [];
  const sentenceCoverage = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length || containerFeature.test(String(feature.name ?? "").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, ""))) continue;
    const sentences = archetypeRuleSentences(feature.summary);
    const covered = new Set();
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      const resource = resourceReference(sentence);
      if (!resource) continue;
      const names = parsedSpells(sentence);
      if (!names.length) continue;
      const prefix = sentence.slice(0, Math.max(0, sentence.search(/\b(?:cast|use|as if)\b/i)));
      const minimumLevel = Math.max(1, Number([...prefix.matchAll(/\b(?:At|Beginning at|Starting at) (\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1] ?? feature.level ?? 1));
      for (const name of names) actions.push({
        sourceFeatureId: feature.id,
        action: {
          id: `${feature.id}-resource-spell-${spellId(name)}-${sentenceIndex}`,
          label: `Cast ${name}`,
          classId: archetype.classId,
          minimumLevel,
          ...resource,
          spellLikeAbility: { spellId: spellId(name), spellName: name, cadence: "at-will" },
          summary: sentence,
        },
      });
      sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
      covered.add(sentenceIndex);
    }
    if (covered.size && sentences.every((sentence, index) => covered.has(index) || archetypeReplacementBoilerplate(sentence))) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, sentenceCoverage, fullyAutomatedFeatureIds };
}

export const inferArchetypeResourceSpellActions = (archetype) => inferredArchetypeResourceSpellActionDetails(archetype).actions;
