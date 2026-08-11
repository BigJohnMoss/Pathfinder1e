const detailsCache = new WeakMap();

const normalizedText = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/Ã¢â‚¬â„¢/g, "'")
  .replace(/Ã¢â‚¬â€œ|Ã¢â‚¬â€/g, "-")
  .replace(/\s+/g, " ")
  .trim();

const normalizedValues = (values) => [...new Set(values.filter(Boolean).map((value) => String(value).trim().toLowerCase()))];
const spellSchools = (spell) => normalizedValues(spell.schools?.length ? spell.schools : [spell.school]);
const spellDescriptors = (spell) => normalizedValues(spell.descriptors ?? []);
const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentionedValues = (text, values) => values.filter((value) => new RegExp(`\\b${escaped(value)}\\b`, "i").test(text));

function catalogNames(spells) {
  return {
    schools: normalizedValues((spells ?? []).flatMap((spell) => spellSchools(spell))),
    descriptors: normalizedValues((spells ?? []).flatMap((spell) => spellDescriptors(spell))),
  };
}

function restrictionValues(summary, names) {
  const restrictions = [];
  const sentences = normalizedText(summary).split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (!/\b(?:cannot|can't|may not)\b[^.]{0,160}\b(?:cast|learn|prepare)\b/i.test(sentence)) continue;
    if (/\b(?:descriptor|descriptors)\b/i.test(sentence)) restrictions.push({
      kind: "descriptor",
      values: mentionedValues(sentence, names.descriptors),
    });
    if (/\b(?:school|schools)\b/i.test(sentence)) restrictions.push({
      kind: "school",
      values: mentionedValues(sentence, names.schools),
    });
  }
  return restrictions.filter((restriction) => restriction.values.length);
}

function isFullyAutomatedRestriction(summary, names) {
  const sentences = normalizedText(summary).split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length > 0 && sentences.every((sentence) =>
    restrictionValues(sentence, names).length > 0
      || /^(?:this|these) (?:ability|abilities) (?:alters?|replaces?)\b/i.test(sentence),
  );
}

function expansionRule(summary, names) {
  if (!/\b(?:adds? all|and all)\b/i.test(summary) || !/\b(?:spell|formula) list\b/i.test(summary)) return null;
  const phrase = summary.match(/\b(?:adds? all|and all)\b[^.]{0,500}/i)?.[0] ?? "";
  const sourceClassId = /\bsorcerer\s*\/\s*wizard spells?\b/i.test(phrase)
    ? "wizard"
    : phrase.match(/\ball (?:spells?[^.]{0,80}?on the )?([a-z]+) spell list\b/i)?.[1]?.toLowerCase();
  if (!sourceClassId) return null;
  const maximumSpellLevel = Number(
    phrase.match(/\b(?:of\s+)?([0-9])(?:st|nd|rd|th)?[- ]level (?:and|or) lower\b/i)?.[1]
      ?? phrase.match(/\b0\s*-\s*through\s+([0-9])(?:st|nd|rd|th)?[- ]level\b/i)?.[1],
  );
  if (!Number.isInteger(maximumSpellLevel)) return null;
  const schools = /\bschool\b/i.test(phrase) ? mentionedValues(phrase, names.schools) : [];
  const descriptors = /\bdescriptor\b/i.test(phrase) ? mentionedValues(phrase, names.descriptors) : [];
  if (!schools.length && !descriptors.length) return null;
  return { sourceClassId, maximumSpellLevel, schools, descriptors };
}

function matchesRule(spell, rule) {
  const sourceLevel = spell.levelByClass?.[rule.sourceClassId];
  if (!Number.isInteger(sourceLevel) || sourceLevel > rule.maximumSpellLevel) return false;
  if (rule.schools.length && !spellSchools(spell).some((school) => rule.schools.includes(school))) return false;
  return !rule.descriptors.length || spellDescriptors(spell).some((descriptor) => rule.descriptors.includes(descriptor));
}

export function inferredArchetypeSpellAccessDetails(archetype, spells = []) {
  const cached = archetype && spells && detailsCache.get(archetype)?.get(spells);
  if (cached) return cached;
  const names = catalogNames(spells);
  const spellListAdditions = {};
  const spellListExclusions = new Set();
  const sourceFeatureIds = new Set();
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = normalizedText(feature.summary);
    const expansion = expansionRule(summary, names);
    if (expansion) {
      for (const spell of spells ?? []) {
        if (!matchesRule(spell, expansion)) continue;
        const sourceLevel = spell.levelByClass[expansion.sourceClassId];
        const currentLevel = spell.levelByClass?.[archetype.classId];
        if (Number.isInteger(currentLevel) && currentLevel <= sourceLevel) continue;
        spellListAdditions[spell.id] = sourceLevel;
      }
      if (Object.keys(spellListAdditions).length) sourceFeatureIds.add(feature.id);
    }
    const restrictions = restrictionValues(summary, names);
    if (restrictions.length) {
      for (const spell of spells ?? []) {
        if (!Number.isInteger(spell.levelByClass?.[archetype.classId]) && spellListAdditions[spell.id] === undefined) continue;
        if (restrictions.some((restriction) => restriction.kind === "school"
          ? spellSchools(spell).some((school) => restriction.values.includes(school))
          : spellDescriptors(spell).some((descriptor) => restriction.values.includes(descriptor)))) spellListExclusions.add(spell.id);
      }
      if (spellListExclusions.size) sourceFeatureIds.add(feature.id);
      if (isFullyAutomatedRestriction(summary, names)) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  const result = { spellListAdditions, spellListExclusions: [...spellListExclusions], sourceFeatureIds, fullyAutomatedFeatureIds };
  if (archetype && spells && typeof archetype === "object" && typeof spells === "object") {
    const byCatalogue = detailsCache.get(archetype) ?? new WeakMap();
    byCatalogue.set(spells, result);
    detailsCache.set(archetype, byCatalogue);
  }
  return result;
}

export function inferArchetypeSpellAccess(archetype, spells = []) {
  const { spellListAdditions, spellListExclusions } = inferredArchetypeSpellAccessDetails(archetype, spells);
  return { spellListAdditions, spellListExclusions };
}
