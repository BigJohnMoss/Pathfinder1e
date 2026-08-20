import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
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

const featureLabel = (feature) => String(feature?.name ?? "Ability").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "");

function spellNames(raw) {
  return cleanSpellName(raw).split(/\s*(?:,|\bor\b|\band\b)\s*/i)
    .map(cleanSpellName)
    .filter((name) => name && name.length <= 80 && name.split(/\s+/).length <= 8 && !/^(?:a|an|the|a spell|spell)$/i.test(name) && !/\b(?:ability|action|casts?|effect|following|power|spell slot|when|whenever)\b/i.test(name));
}

function resourceReference(sentence) {
  const patterns = [
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+rounds? of (?:his|her|their)?\s*bardic performance\b/i, "bardicPerformance"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+rounds? of (?:his|her|their)?\s*raging song\b/i, "ragingSongRounds"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:uses? of )?(?:his|her|their)?\s*inspiration\b/i, "inspiration"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+grit points?\b/i, "grit"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+panache points?\b/i, "panache"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?arcane pool\b/i, "arcanePool"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) ki pool|ki points?)\b/i, "kiPool"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?phrenic pool\b/i, "phrenicPool"],
    [/\b(?:spend|spending|expend|expending)\s+(one|two|three|four|five|six|\d+)\s+uses? of (?:his|her|their)?\s*fervor\b/i, "fervor"],
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
  for (const match of sentence.matchAll(/\bgain(?:s|ing)? (?:the )?effects? of ([a-z][a-z'\u2019 -]{1,70}?)(?=\s+(?:for|until|by)\b|[,.;]|$)/gi)) found.push(...spellNames(match[1]));
  for (const match of sentence.matchAll(/\bas (?:per )?(?:the )?([a-z][a-z'\u2019 -]{1,70}?) spell\b/gi)) found.push(...spellNames(match[1]));
  for (const match of sentence.matchAll(/\b(?:create|produce|radiate)\s+([a-z][a-z'\u2019 -]{1,50}?)\s*\(as the spell\b/gi)) found.push(...spellNames(match[1]));
  for (const match of sentence.matchAll(/\bfunctions? (?:as|like)(?: per)? (?:the )?(?:targeted dispel(?: magic)? option of )?([a-z][a-z'\u2019/ -]{1,70}?)(?=\s*(?:,|\.|$))/gi)) found.push(...spellNames(match[1]));
  return [...new Set(found.map((name) => name.toLowerCase()))];
}

function variableResourceCost(sentences, sentenceIndex, sentence, resource) {
  const nextSentence = sentences[sentenceIndex + 1];
  if (!nextSentence) return undefined;
  const additionalMaximum = sentence.match(/\bup to (one|two|three|four|five|six|seven|eight|nine|ten|\d+) additional (?:willing )?(creatures?|targets?)\b/i);
  const increase = nextSentence.match(/\bEach additional (?:creature|target) increases the cost by (one|two|three|four|five|six|\d+)\b/i);
  if (!additionalMaximum || !increase) return undefined;
  const maximum = resource.cost + numericValue(additionalMaximum[1]) * numericValue(increase[1]);
  const unit = resource.resourceId === "kiPool" ? "Ki points" : "Resource points";
  return {
    coverageIndex: sentenceIndex + 1,
    variableCost: { label: `${unit} (including additional creatures)`, minimum: resource.cost, maximum },
  };
}

function triggerConfirmations(sentence) {
  const trigger = sentence.match(/\bwhenever (.{1,180}?),\s*(?:he|she|they|the [a-z'\u2019 -]+) can\b/i)?.[1]?.trim();
  return trigger ? [{ id: "trigger-occurred", label: `Trigger occurred: ${trigger}`, requiredForActivation: true }] : [];
}

function parsedSavingThrow(sentence, classId) {
  const match = sentence.match(/\bDC is equal to (\d+) \+ (?:1\/2|half) (?:the )?[a-z'\u2019 -]*class level \+ (?:his|her|their) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier\b/i);
  if (!match) return undefined;
  return {
    label: "Spell",
    base: Number(match[1]),
    levelDivisor: 2,
    ability: match[2].toLowerCase(),
    classId,
  };
}

function actionType(sentence) {
  return sentence.match(/\b(?:as |use \w+ as )?(a |an )?(full-round|immediate|move|standard|swift) action\b/i)?.[2]?.toLowerCase();
}

function spellDuration(sentence, minimumLevel) {
  if (/\bfor (?:a number of rounds equal to (?:his|her|their) [a-z]+ modifier|1 round per (?:[a-z]+ )?level)\b/i.test(sentence)) return {
    defaultRoundsByLevel: Array.from({ length: 21 - minimumLevel }, (_, index) => ({ level: minimumLevel + index, rounds: minimumLevel + index })),
  };
  const fixed = sentence.match(/\bfor\s+(one|two|three|four|five|six|\d+)\s+(rounds?|minutes?)\b/i);
  if (!fixed) return undefined;
  const amount = numericValue(fixed[1]) * (/minute/i.test(fixed[2]) ? 10 : 1);
  return { defaultRounds: amount };
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
      let spellSentenceIndex = sentenceIndex;
      let names = parsedSpells(sentence);
      if (!names.length && sentences[sentenceIndex + 1]) {
        names = parsedSpells(sentences[sentenceIndex + 1]);
        if (names.length) spellSentenceIndex = sentenceIndex + 1;
      }
      if (!names.length) continue;
      const prefix = sentence.slice(0, Math.max(0, sentence.search(/\b(?:cast|use|as if)\b/i)));
      const minimumLevel = Math.max(1, Number([...prefix.matchAll(/\b(?:At|Beginning at|Starting at) (\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1] ?? feature.level ?? 1));
      const spellSentence = sentences[spellSentenceIndex];
      const combinedSentence = spellSentenceIndex === sentenceIndex ? sentence : `${sentence} ${spellSentence}`;
      const activation = actionType(combinedSentence);
      const duration = spellDuration(combinedSentence, minimumLevel);
      const prerequisiteSpell = sentences[spellSentenceIndex + 1]?.match(/\bmust already have ([a-z][a-z'\u2019 -]{1,70}?) (?:available )?as a spell-like ability\b/i)?.[1]?.trim().toLowerCase();
      const variableCost = variableResourceCost(sentences, sentenceIndex, sentence, resource);
      const saveSentenceIndex = [spellSentenceIndex + 1, spellSentenceIndex + 2].find((index) => parsedSavingThrow(sentences[index] ?? "", archetype.classId));
      const savingThrow = saveSentenceIndex === undefined ? undefined : parsedSavingThrow(sentences[saveSentenceIndex], archetype.classId);
      const equivalent = spellSentenceIndex !== sentenceIndex || /\bfunctions? (?:as|like)\b/i.test(sentence);
      for (const name of names) actions.push({
        sourceFeatureId: feature.id,
        action: {
          id: `${feature.id}-resource-spell-${spellId(name)}-${sentenceIndex}`,
          label: equivalent ? `Use ${featureLabel(feature)} (${name})` : `Cast ${name}`,
          classId: archetype.classId,
          minimumLevel,
          ...resource,
          ...(variableCost ? { variableCost: variableCost.variableCost } : {}),
          ...(activation ? { actionTypeByLevel: [{ level: minimumLevel, actionType: activation }] } : {}),
          ...((prerequisiteSpell === name || triggerConfirmations(sentence).length) ? { confirmations: [
            ...(prerequisiteSpell === name ? [{ id: `${spellId(name)}-spell-like-ability`, label: `Has ${name} as a spell-like ability`, requiredForActivation: true }] : []),
            ...triggerConfirmations(sentence),
          ] } : {}),
          ...(savingThrow ? { savingThrow } : {}),
          spellLikeAbility: { spellId: spellId(name), spellName: name, cadence: "at-will", ...(equivalent ? { kind: "spell-equivalent" } : {}) },
          ...(duration ? { activeEffect: { name, targets: ["self"], bonus: 0, description: combinedSentence, ...duration, fixedRounds: true, replaceExisting: true } } : {}),
          summary: combinedSentence,
        },
      });
      sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
      covered.add(sentenceIndex);
      if (spellSentenceIndex !== sentenceIndex) {
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: spellSentenceIndex });
        covered.add(spellSentenceIndex);
      }
      if (variableCost) {
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: variableCost.coverageIndex });
        covered.add(variableCost.coverageIndex);
      }
      if (saveSentenceIndex !== undefined) {
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: saveSentenceIndex });
        covered.add(saveSentenceIndex);
      }
      if (prerequisiteSpell && names.includes(prerequisiteSpell)) {
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex: spellSentenceIndex + 1 });
        covered.add(spellSentenceIndex + 1);
      }
    }
    if (covered.size && sentences.every((sentence, index) => covered.has(index) || archetypeReplacementBoilerplate(sentence))) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, sentenceCoverage, fullyAutomatedFeatureIds };
}

export const inferArchetypeResourceSpellActions = (archetype) => inferredArchetypeResourceSpellActionDetails(archetype).actions;
