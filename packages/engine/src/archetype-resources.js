import { inferArchetypeSpellLikeAbilityResources } from "./archetype-spell-like-abilities.js";

const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const numberWords = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);

const resourceId = (feature) => `archetype-${feature.id}`;
const resourceLabel = (feature) => String(feature.name ?? "Archetype resource").replace(/\s*\([A-Za-z, ]+\)\s*$/, "").trim();

function replacementAbility(summary) {
  const direct = summary.match(/\buses?\s+(?:(?:his|her|their|its)\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+(?:score|modifier))?\s+instead of\s+(?:(?:his|her|their|its)\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i);
  if (direct) return { ability: direct[1].toLowerCase(), replacesAbility: direct[2].toLowerCase() };
  const reversed = summary.match(/\binstead of using\s+(?:(?:his|her|their|its)\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)[^.]+?\b(?:he|she|they|it) uses?\s+(?:(?:his|her|their|its)\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/i);
  return reversed ? { ability: reversed[2].toLowerCase(), replacesAbility: reversed[1].toLowerCase() } : undefined;
}

function baseResourceOverrides(archetype, feature, summary) {
  const replacement = replacementAbility(summary);
  const common = { sourceFeatureId: feature.id, operation: "replace", unit: "point", minimum: 1 };
  if (archetype.classId === "gunslinger" && replacement?.replacesAbility === "wisdom" && /\bnumber of grit points\b/i.test(summary)) return [{
    ...common, resourceId: "grit", label: "Grit", minimumLevel: 1, base: 0, abilityModifier: replacement.ability,
  }];
  if (archetype.classId === "monk" && replacement?.replacesAbility === "wisdom" && /\bsize of (?:his|her|their) ki pool\b/i.test(summary)) return [{
    ...common, resourceId: "kiPool", label: "Ki pool", minimumLevel: 4, base: 0, levelDivisor: 2, abilityModifier: replacement.ability,
  }];
  if (archetype.classId === "gunslinger" && /\bgains the bombs ability as an alchemist of (?:his|her|their) gunslinger level\s*(?:-|–|−|minus)\s*4\b/i.test(summary)
    && /\busing (?:his|her|their) Charisma modifier in place of (?:his|her|their) Intelligence modifier to determine (?:his|her|their) number of bombs per day\b/i.test(summary)) return [{
    ...common, resourceId: "bombs", label: "Bombs", minimumLevel: 5, base: 1, perInterval: 1, interval: 1, abilityModifier: "charisma",
  }];
  return [];
}

function inferredBaseResourceOverrides(archetype) {
  return (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []).flatMap((feature) =>
    baseResourceOverrides(archetype, feature, String(feature.summary ?? "").replace(/\s+/g, " ")),
  );
}

function parseFormula(raw, minimumLevel) {
  let text = String(raw)
    .replace(/\([^)]*minimum[^)]*\)/gi, "")
    .replace(/\b(?:his|her|their|the|your)\b/gi, "")
    .replace(/\b(?:alchemist|bard|brawler|cavalier|cleric|druid|fighter|gunslinger|hunter|inquisitor|investigator|kineticist|magus|medium|mesmerist|monk|occultist|oracle|paladin|psychic|ranger|rogue|samurai|shaman|skald|slayer|sorcerer|spiritualist|summoner|swashbuckler|warpriest|witch|wizard)\b/gi, "class")
    .replace(/\s+/g, " ")
    .trim();
  const abilityEnd = text.match(/\b(?:modifier|bonus)\b/i);
  if (abilityEnd && !/^\s*\+\s*(?:(?:1\s*\/\s*2|half|twice|double) )?(?:class )?level/i.test(text.slice(abilityEnd.index + abilityEnd[0].length)))
    text = text.slice(0, abilityEnd.index + abilityEnd[0].length);
  const ability = abilityNames.find(name => new RegExp(`${name} (?:modifier|bonus)`, "i").test(text));
  const abilityMultiplier = ability && new RegExp(`(?:twice|double) (?:the )?${ability} (?:modifier|bonus)`, "i").test(text) ? 2 : 1;
  const constant = Number(text.match(/(?:^|\+)\s*(\d+)\s*(?:\+|$)/)?.[1] ?? 0);
  const fractionalLevelDivisor = Number(text.match(/1\s*\/\s*(\d+) (?:class )?level/i)?.[1] ?? (/half (?:class )?level/i.test(text) ? 2 : 0));
  const hasDoubleLevel = /(?:twice|double) (?:class )?level/i.test(text);
  const hasFractionalLevel = fractionalLevelDivisor >= 2;
  const hasLevel = !hasFractionalLevel && !hasDoubleLevel && /(?:class )?level/i.test(text);
  if (!ability && !hasFractionalLevel && !hasDoubleLevel && !hasLevel && !Number.isFinite(constant)) return undefined;
  if (!ability && !hasFractionalLevel && !hasDoubleLevel && !hasLevel && constant === 0) return undefined;
  return {
    base: constant,
    ...(ability ? { abilityModifier: ability } : {}),
    ...(abilityMultiplier > 1 ? { abilityMultiplier } : {}),
    ...(hasFractionalLevel ? { levelDivisor: fractionalLevelDivisor } : {}),
    ...(hasDoubleLevel ? { levelMultiplier: 2 } : {}),
    ...(hasLevel ? { levelMultiplier: 1 } : {}),
    minimum: /minimum (?:of )?1|minimum 1/i.test(raw) ? 1 : 0,
    minimumLevel,
  };
}

export function inferArchetypeResourceAdjustments(archetype) {
  const inferred = [];
  const features = (archetype?.replacements ?? []).flatMap(item => item.features ?? []);
  for (const feature of features) {
    // These headings are either parser fragments or containers for subordinate
    // creature abilities, so a tracker named after the heading would mislead.
    if (/^saving throws?$/i.test(String(feature.name ?? "").trim()) || /\bfamiliar\b/i.test(String(feature.name ?? ""))) continue;
    const minimumLevel = Math.max(1, Math.trunc(feature.level ?? 1));
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    inferred.push(...baseResourceOverrides(archetype, feature, summary));
    const sentences = summary.split(/(?<=[.!?])\s+/);
    let foundResource = false;
    for (const sentence of sentences) {
      if (/(?:companion|eidolon|familiar|homunculus|phantom|mount)\b[^.]{0,100}\b(?:times|rounds|points) per day/i.test(sentence)) continue;
      const unit = /rounds? per day/i.test(sentence) ? "round" : /\bpool\b|points? in/i.test(sentence) ? "point" : "use";
      if (/\beach (?:spell-like ability|of (?:these|the following))/i.test(sentence)) continue;
      const formulaMatch = sentence.match(/(?:number|total number) of (?:times|rounds) per day equal to (.+?)(?:[,.;]|$)/i)
        ?? sentence.match(/(?:number of points in [^.]{0,60} pool|(?:begins with|has|gains?) (?:an? |the )?[a-z' -]{1,45} pool) (?:is )?equal to (.+?)(?:[,.;]|$)/i);
      let adjustment;
      if (formulaMatch) adjustment = parseFormula(formulaMatch[1], minimumLevel);
      if (!adjustment) {
        const fixed = sentence.match(/(?:can|may) (?:use|cast|channel|attempt|perform)[^.]{0,100}?\b(once|twice|\d+ times?) per day/i);
        if (fixed) adjustment = { base: fixed[1].toLowerCase() === "once" ? 1 : fixed[1].toLowerCase() === "twice" ? 2 : Number(fixed[1].match(/\d+/)?.[0]), minimumLevel, minimum: 0 };
      }
      if (!adjustment) {
        const leadingFrequency = sentence.match(/\b(once|twice|\d+ times?) per day\b[^.]{0,180}\b(?:can|may)\b/i);
        if (leadingFrequency) adjustment = { base: numericValue(leadingFrequency[1].replace(/\s+times?$/i, "")), minimumLevel, minimum: 0 };
      }
      if (!adjustment) continue;
      const perLevel = summary.match(/once per day (?:for every|per)\s*(\d+|one|two|three|four|five|six)?\s*(?:(?:class|[a-z]+) )?levels?/i);
      if (perLevel) {
        const divisor = perLevel[1] ? numericValue(perLevel[1]) : 1;
        adjustment.base = 0;
        delete adjustment.perInterval;
        delete adjustment.interval;
        if (divisor === 1) adjustment.levelMultiplier = 1;
        else adjustment.levelDivisor = divisor;
      }
      const scaling = summary.match(/(?:plus|and|gaining|use this ability) (?:one|an) additional (?:use |time )?(?:per day )?(?:at [^.]{0,35}? and )?(?:for |at )?every\s+(\d+|one|two|three|four|five|six)\s+(?:(?:class|[a-z]+) )?levels?(?: beyond [^,.;]+| thereafter)?/i);
      if (scaling) {
        adjustment.perInterval = 1;
        adjustment.interval = numericValue(scaling[1]);
      }
      const maximum = summary.match(/(?:maximum|total) of\s+(\d+|one|two|three|four|five|six)\s+(?:times|uses)/i);
      if (maximum) adjustment.maximum = numericValue(maximum[1]);
      const levelTiers = [
        ...summary.matchAll(/\b(once|twice|\d+|one|two|three|four|five|six)(?: times?)? per day at (\d+)(?:st|nd|rd|th)(?: level)?/gi),
        ...[...summary.matchAll(/\bAt (\d+)(?:st|nd|rd|th) level[^.]{0,100}?\b(?:use|channel|perform|attempt)[^.]{0,60}?\b(once|twice|\d+|one|two|three|four|five|six)(?: times?)? per day\b/gi)]
          .map((match) => [match[0], match[2], match[1]]),
      ]
        .map((match) => ({ level: Number(match[2]), maximum: numericValue(match[1]) }))
        .filter((entry) => entry.level >= minimumLevel && Number.isFinite(entry.maximum));
      if (levelTiers.length && !adjustment.perInterval && !adjustment.levelDivisor && !adjustment.levelMultiplier) adjustment.maximumByLevel = [
        { level: minimumLevel, maximum: adjustment.base },
        ...levelTiers,
      ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.level === entry.level) === index);
      inferred.push({
        resourceId: resourceId(feature),
        label: resourceLabel(feature),
        unit,
        operation: "replace",
        ...adjustment,
      });
      foundResource = true;
      break;
    }
    if (!foundResource) {
      const metadataFormula = String(feature.uses ?? "").match(/^(.+?)\s+per day$/i);
      if (metadataFormula && /\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(?:modifier|bonus)\b/i.test(metadataFormula[1]) && !/\b(?:slot|bardic performance|ki|grit|panache|fervor|channel energy|smite evil)\b/i.test(metadataFormula[1])) {
        const adjustment = parseFormula(metadataFormula[1], minimumLevel);
        if (adjustment) inferred.push({
          resourceId: resourceId(feature),
          label: resourceLabel(feature),
          unit: "use",
          operation: "replace",
          ...adjustment,
        });
      }
    }
  }
  return inferred;
}

export function resolvedArchetypeResourceAdjustments(archetype) {
  const explicit = archetype?.resourceAdjustments ?? [];
  const spellLike = inferArchetypeSpellLikeAbilityResources(archetype);
  const spellLikeFeatureIds = new Set(spellLike.map((resource) => resource.sourceFeatureId));
  const baseOverrides = inferredBaseResourceOverrides(archetype)
    .filter((resource) => !explicit.some((configured) => configured.resourceId === resource.resourceId));
  const general = (explicit.length ? [...baseOverrides, ...explicit] : inferArchetypeResourceAdjustments(archetype))
    .filter((resource) => !spellLikeFeatureIds.has(resource.sourceFeatureId ?? resource.resourceId.replace(/^archetype-/, "")));
  return [...general, ...spellLike];
}
