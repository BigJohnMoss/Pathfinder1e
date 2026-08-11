const detailsCache = new WeakMap();

const normalizedText = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/Ã¢â‚¬â„¢/g, "'")
  .replace(/Ã¢â‚¬â€œ|Ã¢â‚¬â€/g, "-")
  .replace(/\s+/g, " ")
  .trim();

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function uniqueSpellMatches(text, spells) {
  const matches = [];
  const occupied = [];
  for (const spell of spells ?? []) {
    const name = normalizedText(spell?.name);
    if (!name) continue;
    const aliases = [name];
    const comma = name.match(/^(.+), (greater|lesser|mass)$/i);
    if (comma) aliases.push(`${comma[2]} ${comma[1]}`, `${comma[1]} (${comma[2]})`);
    for (const alias of aliases) {
      const match = new RegExp(`(^|[^a-z0-9])${escaped(alias)}(?=$|[^a-z0-9])`, "i").exec(text);
      if (match) matches.push({ spell, start: match.index + match[1].length, end: match.index + match[0].length });
    }
  }
  return matches
    .sort((left, right) => left.start - right.start || (right.end - right.start) - (left.end - left.start))
    .filter((match) => {
      if (occupied.some(([start, end]) => match.start < end && match.end > start)) return false;
      occupied.push([match.start, match.end]);
      return true;
    })
    .filter((match, index, all) => all.findIndex((item) => item.spell.id === match.spell.id) === index)
    .map((match) => match.spell);
}

function namedCasterLevelModifier(feature, summary, spells) {
  const match = summary.match(/\bcasts? the following spells as though (?:her|his|their) caster level were (\d+) higher\s*:\s*(.+?)(?=\.\s+At \d|\.\s+This |$)/i);
  if (!match) return null;
  const spellIds = uniqueSpellMatches(match[2], spells).map((spell) => spell.id);
  if (!spellIds.length) return null;
  const base = Number(match[1]);
  const improvement = summary.match(/\bAt (\d+)(?:st|nd|rd|th) level, the bonus to (?:her|his|their) caster level for these spells increases to \+(\d+)\b/i);
  const minimumLevel = improvement && Number(improvement[1]) === feature.level ? 1 : feature.level ?? 1;
  return {
    sourceFeatureId: feature.id,
    label: feature.name,
    target: "casterLevel",
    minimumLevel,
    base,
    spellIds,
    ...(improvement ? { bonusByLevel: [{ level: minimumLevel, bonus: base }, { level: Number(improvement[1]), bonus: Number(improvement[2]) }] } : {}),
  };
}

function descriptorSaveDcModifiers(feature, summary, descriptorNames) {
  const rules = [];
  const pattern = /\b(?:casts? a spell with the|spells? that deal)\s+([a-z-]+)\s+(?:descriptor|damage)[^.]{0,100}?save DC(?:s| of the spell)?\s+increases? by (\d+)\b/gi;
  for (const match of summary.matchAll(pattern)) {
    const descriptor = match[1].toLowerCase();
    if (!descriptorNames.has(descriptor)) continue;
    rules.push({
      sourceFeatureId: feature.id,
      label: feature.name,
      target: "saveDc",
      minimumLevel: feature.level ?? 1,
      base: Number(match[2]),
      descriptors: [descriptor],
    });
  }
  return rules;
}

function namedSaveDcModifier(feature, summary, spells) {
  const match = summary.match(/\bthe save DC of any (.+?) spell (?:he|she|they) casts? increases? by (\d+)\b/i);
  if (!match) return null;
  const spellIds = uniqueSpellMatches(match[1], spells).map((spell) => spell.id);
  return spellIds.length ? {
    sourceFeatureId: feature.id,
    label: feature.name,
    target: "saveDc",
    minimumLevel: feature.level ?? 1,
    base: Number(match[2]),
    spellIds,
  } : null;
}

function concentrationModifier(feature, summary, spells) {
  if (feature.spellAutomation || feature.optionGroupId) return null;
  const match = summary.match(/\bgains? a \+(\d+) [^.]{0,30}bonus on (?:all )?concentration checks?([^.]*)/i);
  if (!match || /\brather than\b/i.test(match[2])) return null;
  const rawSuffix = match[2].trim().replace(/^,\s*/, "");
  const suffix = /^on caster level checks/i.test(rawSuffix) ? "" : rawSuffix;
  const summonMonsterOnly = /\bsummon monster spell\b/i.test(suffix);
  const spellIds = summonMonsterOnly
    ? (spells ?? []).filter((spell) => /^Summon Monster\b/i.test(spell.name)).map((spell) => spell.id)
    : undefined;
  return {
    sourceFeatureId: feature.id,
    label: feature.name,
    target: "concentration",
    minimumLevel: feature.level ?? 1,
    base: Number(match[1]),
    ...(spellIds?.length ? { spellIds } : {}),
    ...(suffix ? { condition: suffix.replace(/^to cast\b/i, "when casting").replace(/^to\s+/i, "when ") } : {}),
  };
}

const ruleKey = (rule) => `${rule.sourceFeatureId}:${rule.target}:${rule.spellIds?.join(",") ?? ""}:${rule.descriptors?.join(",") ?? ""}`;

export function inferredArchetypeSpellModifierDetails(archetype, spells = []) {
  const cached = archetype && spells && detailsCache.get(archetype)?.get(spells);
  if (cached) return cached;
  const descriptorNames = new Set((spells ?? []).flatMap((spell) => spell.descriptors ?? []).map((value) => String(value).toLowerCase()));
  const adjustments = [];
  const sentenceCoverage = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = normalizedText(feature.summary);
    const rules = [
      namedCasterLevelModifier(feature, summary, spells),
      ...descriptorSaveDcModifiers(feature, summary, descriptorNames),
      namedSaveDcModifier(feature, summary, spells),
      concentrationModifier(feature, summary, spells),
    ].filter(Boolean);
    adjustments.push(...rules);
    if (!rules.length) continue;
    const sentences = summary.split(/(?<=[.!?])\s+/);
    const coveredSentenceIndexes = new Set();
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      if (/caster level were \d+ higher|bonus to (?:her|his|their) caster level for these spells increases/i.test(sentence)
        || /save DC(?:s| of the spell)? increases? by \d+/i.test(sentence)
        || /gains? a \+\d+ [^.]{0,30}bonus on (?:all )?concentration checks?/i.test(sentence)) {
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
        coveredSentenceIndexes.add(sentenceIndex);
      }
    }
    if (sentences.every((sentence, sentenceIndex) => coveredSentenceIndexes.has(sentenceIndex)
      || /^(?:this (?:ability )?|these abilities )?(?:alters?|replaces?)\b/i.test(sentence))) fullyAutomatedFeatureIds.add(feature.id);
  }
  const result = { adjustments: [...new Map(adjustments.map((rule) => [ruleKey(rule), rule])).values()], sentenceCoverage, fullyAutomatedFeatureIds };
  if (archetype && spells && typeof archetype === "object" && typeof spells === "object") {
    const byCatalogue = detailsCache.get(archetype) ?? new WeakMap();
    byCatalogue.set(spells, result);
    detailsCache.set(archetype, byCatalogue);
  }
  return result;
}

export function inferArchetypeSpellModifiers(archetype, spells = []) {
  return inferredArchetypeSpellModifierDetails(archetype, spells).adjustments;
}

const spellSchools = (spell) => (spell?.schools?.length ? spell.schools : [spell?.school]).filter(Boolean).map((value) => String(value).toLowerCase());
const spellDescriptors = (spell) => (spell?.descriptors ?? []).map((value) => String(value).toLowerCase());

export function archetypeSpellModifiers(characterClass, classLevel, spell) {
  const matches = (characterClass?.spellModifierAdjustments ?? [])
    .filter((rule) => classLevel >= (rule.minimumLevel ?? 1) && classLevel <= (rule.maximumLevel ?? 20))
    .filter((rule) => !rule.spellIds?.length || rule.spellIds.includes(spell?.id))
    .filter((rule) => !rule.schools?.length || spellSchools(spell).some((school) => rule.schools.includes(school)))
    .filter((rule) => !rule.descriptors?.length || spellDescriptors(spell).some((descriptor) => rule.descriptors.includes(descriptor)));
  const result = { casterLevel: 0, saveDc: 0, concentration: 0, sources: [] };
  for (const rule of matches) {
    const bonus = rule.bonusByLevel?.filter((step) => step.level <= classLevel).sort((left, right) => left.level - right.level).at(-1)?.bonus ?? rule.base;
    result[rule.target] += bonus;
    const statistic = rule.target === "casterLevel" ? "caster level" : rule.target === "saveDc" ? "save DC" : "concentration";
    result.sources.push(`${rule.label}: +${bonus} ${statistic}${rule.condition ? ` (${rule.condition})` : ""}`);
  }
  return result;
}
