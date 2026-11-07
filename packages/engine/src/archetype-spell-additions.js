import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const ordinal = "(?:st|nd|rd|th)";
const detailsCache = new WeakMap();

const normalizedText = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/â€™/g, "'")
  .replace(/â€“|â€”/g, "-")
  .replace(/(?<=[a-z')])(?:ACG|APG|ARG|HA|ISWG|OA|PCS|UC|UI|UM)\b/g, "")
  .replace(/\s+/g, " ")
  .trim();

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function spellMatches(text, spells) {
  const matches = [];
  for (const spell of spells ?? []) {
    const name = normalizedText(spell?.name);
    if (!name) continue;
    const aliases = [name];
    const reordered = name.match(/^(greater|lesser|mass) (.+)$/i);
    if (reordered) aliases.push(`${reordered[2]} (${reordered[1]})`);
    const commaReordered = name.match(/^(.+), (communal|greater|lesser|mass)$/i);
    if (commaReordered) aliases.push(`${commaReordered[2]} ${commaReordered[1]}`, `${commaReordered[1]} (${commaReordered[2]})`);
    for (const alias of aliases) {
      const pattern = new RegExp(`(^|[^a-z0-9])${escaped(alias)}(?=$|[^a-z0-9])`, "ig");
      for (const match of text.matchAll(pattern)) matches.push({
        spell,
        index: match.index + match[1].length,
        end: match.index + match[0].length,
      });
    }
  }
  return matches.sort((left, right) => left.index - right.index || right.end - left.end);
}

function uniqueMatches(matches) {
  const occupied = [];
  const bySpell = new Map();
  for (const match of matches.toSorted((left, right) => left.index - right.index || (right.end - right.index) - (left.end - left.index))) {
    if (occupied.some(([start, end]) => match.index < end && match.end > start)) continue;
    occupied.push([match.index, match.end]);
    bySpell.set(match.spell.id, match);
  }
  return [...bySpell.values()].sort((left, right) => left.index - right.index);
}

function tableEntries(summary, spells) {
  const headings = [...summary.matchAll(new RegExp(`(?:^|[.;:]|\\s)\\s*(0|[1-9])${ordinal}?\\s*(?:-(?!level\\b)|:)\\s*`, "gi"))];
  return headings.flatMap((heading, index) => {
    const before = summary.slice(0, heading.index);
    const nearestAdds = [...before.matchAll(/\badds?\b/gi)].at(-1);
    const listContext = nearestAdds ? before.slice(nearestAdds.index) : "";
    if (!/\b(?:spell list|class list|formula(?:e)? list)\b/i.test(listContext)) return [];
    const level = Number(heading[1]);
    const start = heading.index + heading[0].length;
    const trailingSentence = summary.slice(start).search(/\s+[.]\s+(?=[A-Z])/);
    const lastListEnd = trailingSentence < 0 ? summary.length : start + trailingSentence;
    const end = headings[index + 1]?.index ?? lastListEnd;
    const segment = summary.slice(start, end < start ? summary.length : end);
    return uniqueMatches(spellMatches(segment, spells)).map((match) => ({ spell: match.spell, level, kind: "list" }));
  });
}

function parentheticalEntries(summary, spells) {
  return uniqueMatches(spellMatches(summary, spells)).flatMap((match) => {
    const after = summary.slice(match.end, match.end + 90);
    const level = after.match(new RegExp(`^\\s*(?:\\([^)]*?\\b([0-9])${ordinal}?[- ]level(?:\\s+(?:spell|extract))?[^)]*\\)|\\(([0-9])${ordinal}?\\)|.{0,120}?\\b(?:as|at) (?:(?:an?|the) )?(?:bonus )?([0-9])${ordinal}?[- ]level(?:\\s+(?:spell|extract))(?:s? known)?|.{0,100}?\\bto (?:his|her|their|the) ([0-9])${ordinal}?[- ]level spell list[^.;]{0,60})`, "i"));
    if (!level) return [];
    if (level[2] && /\bgains the following spells at the appropriate levels\b/i.test(summary)) return [];
    const preceding = summary.slice(Math.max(0, match.index - 140), match.index);
    const minimumClassLevel = Number([...preceding.matchAll(/\b(?:At|until) (\d+)(?:(?:st|nd|rd|th))? level\b/gi)].at(-1)?.[1] ?? 0);
    const hasList = /\bspell list\b/i.test(level[0]);
    const hasKnown = /\bspells? known\b/i.test(level[0]);
    return [{ spell: match.spell, level: Number(level[1] ?? level[2] ?? level[3] ?? level[4]), ...(hasList && hasKnown ? { kind: "both" } : hasKnown ? { kind: "known" } : hasList ? { kind: "list" } : {}), ...(minimumClassLevel ? { minimumClassLevel } : {}) }];
  });
}

function progressiveSummonEntries(summary, spells, entries) {
  const interval = Number(summary.match(/\band so on every (\d+) levels? thereafter\b/i)?.[1] ?? 0);
  const family = /\bsummon nature['’]s ally\b/i.test(summary) ? "Summon Nature's Ally" : /\bsummon monster\b/i.test(summary) ? "Summon Monster" : null;
  if (!interval || !family) return [];
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const matching = entries.filter((entry) => normalizedText(entry.spell.name).toLowerCase().startsWith(family.toLowerCase()));
  const second = matching.find((entry) => normalizedText(entry.spell.name).toLowerCase() === `${family} II`.toLowerCase());
  if (!second?.minimumClassLevel) return [];
  const hasList = /\bspell list\b/i.test(summary);
  const hasKnown = /\bspells? known\b/i.test(summary);
  const maximumSpellLevel = Math.max(...matching.map((entry) => entry.level));
  return roman.slice(0, maximumSpellLevel).flatMap((suffix, index) => {
    const spell = spells.find((candidate) => normalizedText(candidate.name).toLowerCase() === `${family} ${suffix}`.toLowerCase());
    if (!spell) return [];
    const explicit = matching.find((entry) => entry.spell.id === spell.id);
    if (explicit) return [explicit];
    const level = index + 1;
    return [{ spell, level, minimumClassLevel: second.minimumClassLevel + Math.max(0, index - 1) * interval, kind: hasList && hasKnown ? "both" : hasKnown ? "known" : "list" }];
  });
}

function groupedParentheticalEntries(summary, spells) {
  if (!/\bgains the following spells at the appropriate levels\b/i.test(summary)) return [];
  const entries = [];
  const pattern = new RegExp(`(?:^|[:,;])\\s*([^,.;:]{1,180}?)\\s*\\(([0-9]{1,2})${ordinal}?\\)`, "gi");
  let spellLevel = 0;
  for (const match of summary.matchAll(pattern)) {
    spellLevel += 1;
    const names = uniqueMatches(spellMatches(match[1], spells));
    for (const name of names) entries.push({ spell: name.spell, level: spellLevel, kind: "known", minimumClassLevel: Number(match[2]) });
  }
  return entries;
}

function respectiveEntries(summary, spells) {
  const entries = [];
  const pattern = new RegExp(`\\badds?\\s+(.{1,260}?)\\s+to (?:his|her|their|the) (?:list of )?(?:[a-z]+ )?(spells known|spell list|formula(?:e)? list)[^.]{0,100}?\\bas\\s+(.{1,100}?)\\s+respectively`, "gi");
  for (const match of summary.matchAll(pattern)) {
    const names = uniqueMatches(spellMatches(match[1], spells));
    const levels = [...match[3].matchAll(new RegExp(`([0-9])${ordinal}?`, "gi"))].map((item) => Number(item[1]));
    if (names.length !== levels.length) continue;
    const kind = /known/i.test(match[2]) ? "known" : "list";
    names.forEach((entry, index) => entries.push({ spell: entry.spell, level: levels[index], kind }));
  }
  return entries;
}

function parentheticalRespectiveEntries(summary, spells) {
  const entries = [];
  const pattern = new RegExp(`\\badds?\\s+(.{1,260}?)\\s*\\(as\\s+(.{1,100}?)\\s+(?:spells?|extracts?),?\\s+respectively\\)\\s+to (?:his|her|their|the) (?:[a-z]+ )?(spells known|spell list|formula(?:e)? list)`, "gi");
  for (const match of summary.matchAll(pattern)) {
    const names = uniqueMatches(spellMatches(match[1], spells));
    const levels = [...match[2].matchAll(new RegExp(`([0-9])${ordinal}?`, "gi"))].map((item) => Number(item[1]));
    if (names.length !== levels.length) continue;
    const kind = /known/i.test(match[3]) ? "known" : "list";
    names.forEach((entry, index) => entries.push({ spell: entry.spell, level: levels[index], kind }));
  }
  return entries;
}

function formulaBookEntries(summary, spells) {
  const entries = [];
  const pattern = new RegExp(`\\badds?\\s+(.{1,600}?)\\s+to (?:his|her|their|the) formula book as (?:an? )?([0-9])${ordinal}[- ]level extracts?`, "gi");
  for (const match of summary.matchAll(pattern)) {
    const minimumClassLevel = Number(summary.slice(0, match.index).match(/\bAt (\d+)(?:(?:st|nd|rd|th))? level\b/i)?.[1] ?? 0);
    for (const entry of uniqueMatches(spellMatches(match[1], spells))) entries.push({
      spell: entry.spell,
      level: Number(match[2]),
      kind: "known",
      ...(minimumClassLevel ? { minimumClassLevel } : {}),
    });
  }
  return entries;
}

function classLevelBonusKnownEntries(summary, spells) {
  const entries = [];
  const pattern = new RegExp(`\\bAt (\\d{1,2})${ordinal} level,?[^.;]{0,80}?\\bgains?\\s+([^.;]{1,160}?)\\s+as (?:an? )?bonus ([0-9])${ordinal}[- ]level spells? known`, "gi");
  for (const match of summary.matchAll(pattern)) {
    const names = uniqueMatches(spellMatches(match[2], spells));
    if (names.length !== 1) continue;
    entries.push({ spell: names[0].spell, level: Number(match[3]), kind: "known", minimumClassLevel: Number(match[1]) });
  }
  return entries;
}

function isFixedSpellExpansion(summary) {
  return /\badds?\b[^.]{0,600}\b(?:spell list|class list|formula(?:e)? list|formula book|extracts? known|spells? known)\b/i.test(summary)
    && !/\b(?:choose|chooses|chosen|select|selects|selected)\b[^.]{0,180}\b(?:spell|extract)s?\b/i.test(summary)
    && !/\b(?:add|adds?) (?:any|one|two|three|four|\d+)\b[^.]{0,180}\b(?:spell|extract)s?\b/i.test(summary);
}

function additionKinds(summary) {
  const spellList = /\b(?:spell list|class list|formula(?:e)? list)\b/i.test(summary);
  const explicitlyKnown = /\b(?:extracts?|spells?) known\b|\badds?\b[^.]{0,600}\bformula book\b/i.test(summary);
  const mustLearn = /\bmust (?:still )?(?:learn|select|add)\b|\bdoesn['’]t automatically gain\b/i.test(summary);
  return { spellList, bonusKnown: explicitlyKnown && !mustLearn, mustLearn };
}

function fixedFormulaBookSentence(sentence, entries, spells) {
  if (!/^(?:At \d+(?:(?:st|nd|rd|th))? level,?\s*)?(?:an? |the )?[a-z][a-z'\u2019 -]{0,100}\s+adds?\b[^.]{1,600}\bto (?:his|her|their|the) formula book as (?:an? )?\d(?:st|nd|rd|th)[- ]level extracts?[.]?$/i.test(sentence)) return false;
  if (/\b(?:but|does not|doesn['’]t|except|only if|without)\b|\([^)]*\b(?:component|require|restriction)\b[^)]*\)/i.test(sentence)) return false;
  const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells)).map(({ spell }) => spell.id);
  const parsed = new Set(entries.map(({ spell }) => spell.id));
  return mentioned.length > 0 && mentioned.every((id) => parsed.has(id));
}

function fixedSpellAdditionSentence(sentence, entries, spells) {
  if (!/^(?:At \d+(?:(?:st|nd|rd|th))? level,?\s*)?(?:(?:he|she|they)|(?:an? |the )?[a-z][a-z'\u2019 -]{0,120})\s+adds?\b[^.]{1,900}\b(?:spell list|class list|formula(?:e)? list|list of [a-z'\u2019 -]{0,60}spells? known|spells? known)\b[^.]*[.]?$/i.test(sentence)) return false;
  if (/\b(?:but|can|choose|chooses|does not|doesn['’]t|except|if|may|must|only|select|selects|while|without)\b|\([^)]*\b(?:component|require|restriction)\b[^)]*\)/i.test(sentence)) return false;
  const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells)).map(({ spell }) => spell.id);
  const parsed = new Set(entries.map(({ spell }) => spell.id));
  return mentioned.length > 0 && mentioned.every((id) => parsed.has(id));
}

function fixedProgressiveSpellSentence(sentence, entries, spells) {
  if (!/^At \d+(?:st|nd|rd|th) level\b[^.]{0,180}\badds?\b[^.]{0,500}\bspell list and spells? known\b[^.]{0,500}\band so on every \d+ levels? thereafter\b[^.]{0,300}\badds?\b[^.]{0,300}\bspell list and spells? known\b/i.test(sentence)) return false;
  const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells)).map(({ spell }) => spell.id);
  const parsed = new Set(entries.map(({ spell }) => spell.id));
  return mentioned.length >= 2 && mentioned.every((id) => parsed.has(id));
}

function fixedBonusKnownSequenceSentence(sentence, entries, spells) {
  if (!/\bAt \d+(?:st|nd|rd|th) level\b[^.]{0,700}\bas (?:an? )?bonus \d(?:st|nd|rd|th)[- ]level spells? known\b/i.test(sentence)) return false;
  if (/\b(?:choose|does not|doesn't|except|if|may|must|only|select|while|without)\b/i.test(sentence)) return false;
  const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells));
  const parsed = entries.filter((entry) => entry.kind === "known" && entry.minimumClassLevel);
  return mentioned.length > 0 && mentioned.every(({ spell }) => parsed.some((entry) => entry.spell.id === spell.id));
}

function fixedMustLearnSpellListSentence(sentence, entries, spells) {
  if (!/\badds?\b[^.]{1,500}\bto (?:his|her|their|the) [a-z ]{0,60}spell list\b[^.]{0,100}\bmust learn these spells as normal\b/i.test(sentence)) return false;
  const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells)).map(({ spell }) => spell.id);
  const parsed = new Set(entries.filter((entry) => entry.kind === "list" || entry.kind === "both").map(({ spell }) => spell.id));
  return mentioned.length > 0 && mentioned.every((id) => parsed.has(id));
}

function structuralSpellTableCoverage(sentences, entries, spells) {
  const covered = new Set();
  const parsed = new Set(entries.map(({ spell }) => spell.id));
  const completeTable = (sentence) => {
    const mentioned = uniqueMatches(spellMatches(normalizedText(sentence), spells)).map(({ spell }) => spell.id);
    return mentioned.length > 0 && mentioned.every((id) => parsed.has(id));
  };
  if (sentences.length >= 3 &&
    /\badds? certain [^.]{0,120}\bspells? to (?:his|her|their|the) spell list[.]?$/i.test(sentences[0]) &&
    /\badds? these (?:abilities|spells) to (?:his|her|their|the) spell list as soon as [^.]{0,160}\bspell level[.]?$/i.test(sentences[1]) &&
    /^(?:0|1st)\s*[-—:]/i.test(sentences[2]) && completeTable(sentences[2])) {
    covered.add(0);
    covered.add(1);
    covered.add(2);
  }
  for (let index = 0; index + 1 < sentences.length; index += 1) {
    if (/\badds? the following spells to (?:his|her|their|the) [^.]{0,80}spell list at the (?:indicated|listed) levels?[.]?$/i.test(sentences[index]) &&
      /^(?:He|She|They) casts? these as (?:divine|arcane|psychic) [^.]{0,80}spells?:/i.test(sentences[index + 1]) && completeTable(sentences[index + 1])) {
      covered.add(index);
      covered.add(index + 1);
    }
  }
  return covered;
}

const nonMechanicalSpellNarrative = (sentence) =>
  !/\d|\b(?:action|adds?|bonus|can|casts?|check|damage|DC|gains?|has|immune|level|may|must|penalty|resistance|roll|round|save|skill|spell|speed|uses?)\b/i.test(sentence) ||
  /\bhas great power over the emotions of others, wielding (?:his|her|their) voice like a weapon\b/i.test(sentence);

function oracleBonusSpellEntries(archetype, feature, spells) {
  if (archetype?.classId !== "oracle" || !/^Bonus Spells$/i.test(feature?.name ?? "")) return [];
  const summary = normalizedText(feature.summary);
  if (/\b(?:choose|chooses|select|selects)\b/i.test(summary)) return [];
  const levelMarkers = [...summary.matchAll(new RegExp(`\\((?:[^)]{0,80}?;\\s*)?(\\d{1,2})${ordinal}(?:[^)]{0,40})?\\)`, "gi"))];
  if (levelMarkers.length < 3) return [];
  const entries = uniqueMatches(spellMatches(summary, spells)).flatMap((match) => {
    const marker = levelMarkers.find((candidate) => candidate.index > match.index && candidate.index - match.end <= 80);
    if (!marker) return [];
    const minimumClassLevel = Number(marker[1]);
    if (!Number.isInteger(minimumClassLevel) || minimumClassLevel < 1 || minimumClassLevel > 20) return [];
    return [{
      spell: match.spell,
      spellLevel: Math.max(1, Math.floor(minimumClassLevel / 2)),
      minimumClassLevel,
    }];
  });
  const unique = [...new Map(entries.map((entry) => [`${entry.spell.id}:${entry.minimumClassLevel}`, entry])).values()];
  return unique.length === levelMarkers.length ? unique : [];
}

function witchPatronReplacementEntries(archetype, feature, spells) {
  if (archetype?.classId !== "witch" || !/^(?:Patron )?Spells$/i.test(feature?.name ?? "")) return [];
  const summary = normalizedText(feature.summary);
  if (!/\breplaces?\b[^.]{0,100}\bpatron(?:'s)? spells? with the following\s*:/i.test(summary)) return [];
  const headings = [...summary.matchAll(/(?:^|[:,;])\s*(2|4|6|8|10|12|14|16|18)(?:st|nd|rd|th)\s*[-:]/gi)];
  if (!headings.length) return [];
  const entries = headings.flatMap((heading, index) => {
    const classLevel = Number(heading[1]);
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? summary.length;
    const matches = uniqueMatches(spellMatches(summary.slice(start, end), spells));
    return matches.length === 1 ? [{ spell: matches[0].spell, spellLevel: classLevel / 2, minimumClassLevel: classLevel }] : [];
  });
  return entries.length === headings.length ? entries : [];
}

export function inferredArchetypeSpellAdditionDetails(archetype, spells = []) {
  const cached = archetype && spells && detailsCache.get(archetype)?.get(spells);
  if (cached) return cached;
  const spellListAdditions = {};
  const bonusSpellAdditions = {};
  const spellGrants = [];
  const sourceFeatureIds = new Set();
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  const bonusSpellReplacementClassLevels = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = normalizedText(feature.summary);
    const witchPatronSpells = witchPatronReplacementEntries(archetype, feature, spells);
    if (witchPatronSpells.length) {
      for (const { spell, spellLevel, minimumClassLevel } of witchPatronSpells) {
        spellGrants.push({ spellId: spell.id, spellLevel, minimumClassLevel, mode: "known", sourceFeatureId: feature.id });
        bonusSpellReplacementClassLevels.add(minimumClassLevel);
      }
      sourceFeatureIds.add(feature.id);
      fullyAutomatedFeatureIds.add(feature.id);
      continue;
    }
    const oracleBonusSpells = oracleBonusSpellEntries(archetype, feature, spells);
    if (oracleBonusSpells.length) {
      for (const { spell, spellLevel, minimumClassLevel } of oracleBonusSpells) {
        spellGrants.push({ spellId: spell.id, spellLevel, minimumClassLevel, mode: "known", sourceFeatureId: feature.id });
        bonusSpellReplacementClassLevels.add(minimumClassLevel);
      }
      sourceFeatureIds.add(feature.id);
      fullyAutomatedFeatureIds.add(feature.id);
      continue;
    }
    if (!isFixedSpellExpansion(summary)) continue;
    const parsedEntries = [...tableEntries(summary, spells), ...parentheticalEntries(summary, spells), ...groupedParentheticalEntries(summary, spells), ...respectiveEntries(summary, spells), ...parentheticalRespectiveEntries(summary, spells), ...formulaBookEntries(summary, spells), ...classLevelBonusKnownEntries(summary, spells)];
    const entries = [...parsedEntries, ...progressiveSummonEntries(summary, spells, parsedEntries)];
    const unique = new Map(entries.filter(({ level }) => Number.isInteger(level) && level >= 0 && level <= 9).map((entry) => [`${entry.spell.id}:${entry.level}`, entry]));
    if (!unique.size) continue;
    const kinds = additionKinds(summary);
    const conditionalKnown = /\badds?\b[^.]{0,160}\bspells? known\b[^.]{0,80}\bwhile\b|\badds?\b[^.]{0,80}\bwhile\b[^.]{0,160}\bspells? known\b/i.test(summary);
    for (const { spell, level, kind, minimumClassLevel } of unique.values()) {
      const addToList = kind === "list" || kind === "both" || (!kind && kinds.spellList);
      const addAsKnown = kind === "known" || kind === "both" || (!kind && kinds.bonusKnown);
      if (addToList) spellListAdditions[spell.id] = Math.min(spellListAdditions[spell.id] ?? level, level);
      if (addAsKnown && (kind === "known" || kind === "both" || !kinds.mustLearn) && !conditionalKnown) spellGrants.push({
        spellId: spell.id,
        spellLevel: level,
        minimumClassLevel: minimumClassLevel ?? feature.level ?? 1,
        mode: "known",
        sourceFeatureId: feature.id,
      });
    }
    if (kinds.spellList || kinds.bonusKnown) {
      sourceFeatureIds.add(feature.id);
      const sentences = archetypeRuleSentences(feature.summary);
      const covered = new Set(sentences.flatMap((sentence, index) =>
        fixedFormulaBookSentence(sentence, [...unique.values()], spells) ||
        fixedSpellAdditionSentence(sentence, [...unique.values()], spells) ||
        fixedProgressiveSpellSentence(sentence, [...unique.values()], spells) ||
        fixedBonusKnownSequenceSentence(sentence, [...unique.values()], spells) ||
        fixedMustLearnSpellListSentence(sentence, [...unique.values()], spells) ? [index] : [],
      ));
      for (const index of structuralSpellTableCoverage(sentences, [...unique.values()], spells)) covered.add(index);
      for (const sentenceIndex of covered) sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
      if (covered.size && sentences.every((sentence, index) => covered.has(index) || archetypeReplacementBoilerplate(sentence) || nonMechanicalSpellNarrative(sentence))) fullyAutomatedFeatureIds.add(feature.id);
    }
  }
  const result = {
    spellListAdditions,
    bonusSpellAdditions,
    spellGrants: [...new Map(spellGrants.map((grant) => [`${grant.mode}:${grant.spellId}`, grant])).values()],
    sourceFeatureIds,
    fullyAutomatedFeatureIds: [...fullyAutomatedFeatureIds],
    sentenceCoverage,
    bonusSpellReplacementClassLevels: [...bonusSpellReplacementClassLevels].sort((left, right) => left - right),
  };
  if (archetype && spells && typeof archetype === "object" && typeof spells === "object") {
    const byCatalogue = detailsCache.get(archetype) ?? new WeakMap();
    byCatalogue.set(spells, result);
    detailsCache.set(archetype, byCatalogue);
  }
  return result;
}

export function inferArchetypeSpellAdditions(archetype, spells = []) {
  const { spellListAdditions, bonusSpellAdditions, spellGrants, bonusSpellReplacementClassLevels } = inferredArchetypeSpellAdditionDetails(archetype, spells);
  return { spellListAdditions, bonusSpellAdditions, spellGrants, bonusSpellReplacementClassLevels };
}
