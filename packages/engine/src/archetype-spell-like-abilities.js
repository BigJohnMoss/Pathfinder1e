import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const numberWords = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);
const subordinate = /\b(?:animal companion|companion|eidolon|familiar|homunculus|mount|phantom)\b/i;
const unsafeName = /\b(?:ability|abilities|effect|effects|following|it|level|slot|spells?|extract|formula|infusion|power)\b/i;

const cleanSpellName = (value) => String(value)
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/\([^)]*\)/g, "")
  .replace(/(?:APG|ARG|HA|OA|OC|UI|UM|UW)\b/g, "")
  .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")
  .replace(/\s+/g, " ")
  .trim();

const spellId = (name) => name
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’']/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();

function spellNames(raw) {
  const cleaned = cleanSpellName(raw)
    .replace(/^one of (?:the )?following spells?(?:, chosen at the time of casting)?:?\s*/i, "")
    .replace(/^(?:either|the spell)\s+/i, "");
  if (!cleaned || cleaned.length > 150) return [];
  const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
  return cleaned.split(/\s*(?:,|\bor\b|\band\b)\s*/i)
    .map(cleanSpellName)
    .map((name) => name.replace(/^(summon monster) (i|ii|iii|iv|v|vi|vii|viii|ix)$/i, (_, family, tier) => `${family} ${roman[tier.toLowerCase()]}`))
    .filter((name) => name && name.split(/\s+/).length <= 7 && !unsafeName.test(name) && !/^summon nature's ally$/i.test(name));
}

function parseFrequency(text) {
  if (/\bat will\b|\bat all times\b/i.test(text)) return { cadence: "at-will" };
  const fixed = text.match(/\b(once|twice|\d+|one|two|three|four|five|six)(?: times?)? per (day|week)\b/i);
  if (fixed) return { cadence: fixed[2].toLowerCase(), base: numericValue(fixed[1]) };
  const ability = text.match(/\ba number of times per day equal to (?:his|her|their|the)?\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier(?:\s*\(minimum\s*(\d+)\))?/i);
  if (ability) return { cadence: "day", base: 0, abilityModifier: ability[1].toLowerCase(), minimum: Number(ability[2] ?? 0) };
  const levelPool = text.match(/\bfor a number of (rounds|minutes) per day equal to\s*(twice|double)?\s*(?:his|her|their|the)?\s*(?:[a-z]+ )?(?:class )?level\b/i);
  if (levelPool) return { cadence: "day", base: 0, levelMultiplier: levelPool[2] ? 2 : 1, unit: levelPool[1].toLowerCase().replace(/s$/, "") };
  if (/\bfor 1 minute per (?:[a-z]+ )?(?:class )?level per day\b/i.test(text)) return { cadence: "day", base: 0, levelMultiplier: 1, unit: "minute" };
  const perLevels = text.match(/\bonce per day for every (\d+|one|two|three|four|five|six) (?:[a-z]+ )?(?:class )?levels?\b/i);
  if (perLevels) return { cadence: "day", base: 0, levelDivisor: numericValue(perLevels[1]), minimum: 0 };
  return undefined;
}

function equivalentSpellNames(sentence) {
  const names = [];
  const used = sentence.match(/\bcan\s+((?:use\s+)?(?:detect|cast|summon)\b.{1,110}?)(?=\s*(?:,?\s+as per|\s+at will|\s+once per|\s+twice per|\s+a number of times per|\s+for a number of|\s+for 1 minute per))/i)?.[1]?.replace(/^use\s+/i, "");
  if (used) names.push(...spellNames(used));
  for (const match of sentence.matchAll(/\bas per\s+(?:the\s+)?(?:spell\s+)?([a-z][a-z' -]*?)(?=\s*(?:[,).;]|\bor create\b|\ba number\b|\bonce\b|\bfor\b|\bat all\b))/gi))
    names.push(...spellNames(match[1]));
  return [...new Set(names.map((name) => name.toLowerCase()))];
}

function parsedEquivalentSentence(feature, sentence, sentenceIndex) {
  if (!/\bas per\b/i.test(sentence) || subordinate.test(sentence) || /\b(?:spend|expend|sacrifice|forgo)\b|\b(?:when|if)\b[^.]{0,120}\binstead\b|\brounds? of (?:bardic performance|rage|raging song)\b/i.test(sentence)) return [];
  const abilityPlusBase = sentence.match(/\ba number of times per day equal to\s*(\d+)\s*\+\s*(?:his|her|their|the)?\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier(?:\s*\(minimum\s*(\d+)\))?/i);
  const frequency = parseFrequency(sentence) ?? (abilityPlusBase ? { cadence: "day", base: Number(abilityPlusBase[1]), abilityModifier: abilityPlusBase[2].toLowerCase(), minimum: Number(abilityPlusBase[3] ?? 0) } : undefined);
  if (!frequency) return [];
  const names = equivalentSpellNames(sentence);
  if (!names.length) return [];
  const minimumLevel = Math.max(1, Number([...sentence.matchAll(/\bAt (\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1] ?? feature.level ?? 1));
  return names.map((name) => ({ name, spellId: spellId(name), frequency, minimumLevel, sentence, sentenceIndex, equivalent: true }));
}

function parsedSentence(feature, sentence, sentenceIndex) {
  if (!/spell[- ]?like abilit/i.test(sentence) || subordinate.test(feature.name ?? "")) return [];
  const parsed = [];
  const pattern = /\b(?:cast|use)\s+(.{1,180}?)\s+(?:(at will|(?:once|twice|\d+|one|two|three|four|five|six)(?: times?)? per (?:day|week)|a number of times per day equal to [^.]+?)\s+)?as (?:a )?spell[- ]?like abilit(?:y|ies)\b/gi;
  for (const match of sentence.matchAll(pattern)) {
    const marker = (match.index ?? 0) + match[0].search(/spell[- ]?like abilit/i);
    if (subordinate.test(sentence.slice(Math.max(0, marker - 180), marker))) continue;
    const preceding = sentence.slice(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0);
    if (/\bif\b[^.]*$/i.test(preceding)) continue;
    const following = sentence.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 100);
    const frequency = parseFrequency(match[2] ?? "") ?? parseFrequency(match[0]) ?? parseFrequency(`${preceding} ${following}`);
    if (!frequency) continue;
    const raw = match[1].split(/\b(?:cast|use)\s+/i).at(-1).replace(/\s+as\s*$/i, "");
    const names = spellNames(raw);
    if (!names.length) continue;
    const prefix = sentence.slice(0, match.index ?? 0);
    const minimumLevel = Math.max(1, Number([...prefix.matchAll(/\bAt (\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1] ?? feature.level ?? 1));
    parsed.push(...names.map((name) => ({ name, spellId: spellId(name), frequency, minimumLevel, sentence, sentenceIndex })));
  }
  return parsed;
}

function parsedInnateSpellSentence(feature, sentence, sentenceIndex) {
  if (!/\(Sp(?:,\s*(?:Ex|Su))*\)\s*$/i.test(feature.name ?? "") || subordinate.test(feature.name ?? "")) return [];
  const frequency = parseFrequency(sentence);
  if (!frequency) return [];
  const spellPattern = "([a-z][a-z' -]{1,100}?)(?=\\s+(?:at will\\b|(?:once|twice|\\d+|one|two|three|four|five|six)(?: times?)? per (?:day|week)\\b|on (?:him|her|them)self\\b|without\\b|using\\b|as\\b|with a caster level\\b|[,.;]))";
  const caster = sentence.match(new RegExp(`\\b(?:can|may) (?:cast|use)\\s+${spellPattern}`, "i"))
    ?? sentence.match(new RegExp(`\\bgains? (?:the )?ability to (?:(?:cast|use)\\s+)?${spellPattern}`, "i"))
    ?? sentence.match(new RegExp(`\\bas if using\\s+${spellPattern}`, "i"));
  if (!caster) return [];
  const prefix = sentence.slice(0, caster.index ?? 0);
  if (subordinate.test(prefix)) return [];
  const names = spellNames(caster[1]);
  if (!names.length) return [];
  const minimumLevel = Math.max(1, Number([...prefix.matchAll(/\bAt (\d+)(?:st|nd|rd|th) level\b/gi)].at(-1)?.[1] ?? feature.level ?? 1));
  return names.map((name) => ({ name, spellId: spellId(name), frequency, minimumLevel, sentence, sentenceIndex }));
}

function progression(resource, summary) {
  const scaling = summary.match(/(?:plus|and|gains?|(?:can )?use this(?: ability)?) (?:one|an) additional (?:use|time)?(?: per day)? (?:at [^.]{0,35}? and )?(?:for |at )?every (\d+|one|two|three|four|five|six) (?:class |[a-z]+ )?levels?(?: beyond [^,.;]+| thereafter)?/i)
    ?? summary.match(/(?:an?|one) additional use each day at \d+(?:st|nd|rd|th) level and every (\d+|one|two|three|four|five|six) levels? thereafter/i);
  if (scaling) {
    resource.perInterval = 1;
    resource.interval = numericValue(scaling[1]);
  }
  const maximum = summary.match(/(?:maximum|total) of (\d+|one|two|three|four|five|six) (?:times|uses)/i);
  if (maximum) resource.maximum = numericValue(maximum[1]);
  const tiers = [...summary.matchAll(/\b(once|twice|\d+|one|two|three|four|five|six)(?: times?)? per day (?:each )?at (\d+)(?:st|nd|rd|th)(?: level)?/gi)]
    .map((match) => ({ level: Number(match[2]), maximum: numericValue(match[1]) }));
  if (tiers.length && !resource.interval) resource.maximumByLevel = tiers;
  return resource;
}

function isFullyRepresented(feature, parsed, sentences) {
  if (!parsed.length || feature.resourceActions?.length) return false;
  if (/\b(?:choose|chosen|instead|material component|focus component|only to|provided that|if |expend|spend|sacrifice|slot|rounds? of|target may|cannot|does not|without expending)\b/i.test(feature.summary ?? "")) return false;
  const covered = new Set(parsed.map((entry) => entry.sentenceIndex));
  return sentences.every((sentence, index) => covered.has(index) || archetypeReplacementBoilerplate(sentence) ||
    !/\b(?:action|attack|bonus|can|cast|check|damage|DC|gains?|has|immune|level|may|penalty|resistance|roll|round|save|spell|times? per|uses?)\b|\d/i.test(sentence));
}

export function inferredArchetypeSpellLikeAbilityDetails(archetype) {
  const actions = [];
  const resources = [];
  const fullyAutomatedFeatureIds = new Set();
  const explicitResources = archetype?.resourceAdjustments ?? [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length) continue;
    const sentences = archetypeRuleSentences(feature.summary);
    const parsed = sentences.flatMap((sentence, sentenceIndex) => [
      ...parsedSentence(feature, sentence, sentenceIndex),
      ...parsedEquivalentSentence(feature, sentence, sentenceIndex),
      ...parsedInnateSpellSentence(feature, sentence, sentenceIndex),
    ]).filter((entry, index, entries) => entries.findIndex((candidate) => candidate.sentenceIndex === entry.sentenceIndex && candidate.spellId === entry.spellId) === index);
    if (!parsed.length) continue;
    const groups = new Map();
    for (const entry of parsed) {
      const key = `${entry.sentenceIndex}:${entry.frequency.cadence}:${entry.frequency.base ?? "formula"}`;
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    for (const [groupKey, entries] of groups) {
      const frequency = entries[0].frequency;
      const shared = entries.length > 1 && !/\b(?:each|both)\b/i.test(entries[0].sentence);
      for (const entry of entries) {
        let resourceId;
        if (frequency.cadence !== "at-will") {
          const explicitResource = explicitResources.find((resource) => {
            return [resource.resourceId, resource.label].some((value) => spellId(value) === entry.spellId);
          });
          resourceId = explicitResource?.resourceId ?? `archetype-${feature.id}-spell-like-${shared ? spellId(groupKey) : entry.spellId}`;
          if (!explicitResource && !resources.some((resource) => resource.resourceId === resourceId)) resources.push(progression({
            sourceFeatureId: feature.id,
            resourceId,
            label: `${feature.name}: ${shared ? "spell-like ability" : entry.name}`,
            unit: "use",
            operation: "replace",
            base: frequency.base ?? 0,
            ...(frequency.abilityModifier ? { abilityModifier: frequency.abilityModifier } : {}),
            minimum: frequency.minimum ?? 0,
            minimumLevel: entry.minimumLevel,
            refreshCadence: frequency.cadence,
            ...(frequency.levelMultiplier ? { levelMultiplier: frequency.levelMultiplier } : {}),
            ...(frequency.levelDivisor ? { levelDivisor: frequency.levelDivisor } : {}),
            ...(frequency.unit ? { unit: frequency.unit } : {}),
          }, feature.summary ?? ""));
        }
        actions.push({
          sourceFeatureId: feature.id,
          action: {
            id: `${feature.id}-cast-${entry.spellId}-${entry.minimumLevel}-${entry.sentenceIndex}`,
            label: `Cast ${entry.name}`,
            classId: archetype.classId,
            minimumLevel: entry.minimumLevel,
            ...(resourceId ? { resourceId, cost: 1 } : {}),
            spellLikeAbility: { spellId: entry.spellId, spellName: entry.name, cadence: frequency.cadence, ...(entry.equivalent ? { kind: "spell-equivalent" } : {}) },
            summary: entry.sentence,
          },
        });
      }
    }
    if (isFullyRepresented(feature, parsed, sentences) && (!parsed.some((entry) => entry.equivalent) || !/\b(?:if|when|while|provided|only|instead|non-outsider|willing)\b/i.test(feature.summary ?? ""))) fullyAutomatedFeatureIds.add(feature.id);
  }
  const sentenceCoverage = [...new Map(actions.map(({ sourceFeatureId, action }) => {
    const sentenceIndex = Number(action.id.match(/-(\d+)$/)?.[1]);
    return [`${sourceFeatureId}:${sentenceIndex}`, { sourceFeatureId, sentenceIndex }];
  })).values()].filter((entry) => Number.isInteger(entry.sentenceIndex));
  return { actions, resources, sentenceCoverage, fullyAutomatedFeatureIds };
}

export function inferArchetypeSpellLikeAbilityActions(archetype) {
  return inferredArchetypeSpellLikeAbilityDetails(archetype).actions;
}

export function inferArchetypeSpellLikeAbilityResources(archetype) {
  return inferredArchetypeSpellLikeAbilityDetails(archetype).resources;
}
