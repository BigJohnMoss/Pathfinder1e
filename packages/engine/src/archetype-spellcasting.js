const abilityPattern = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";

const spellcastingRule = new RegExp(
  `\\buses?\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?\\s+instead of\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?([^.]*)`,
  "i",
);

const normalizedAbility = (value) => String(value ?? "").toLowerCase();
const normalizedClassId = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/-(?:acg|apg|arg|ha|iswg|oa|pcs|uc|ui|um)$/, "").replace(/-class$/, "");

const progressionRules = [
  /\b(?:same number of spell slots per day|same number of spells known and spells per day) as (?:an?|the) ([a-z][a-z -]+?)(?:\s*\([^)]*\))? of (?:his|her|their|its|the) [^.]*?level\b/i,
  /\bbase daily spell allotment is the same as (?:an?|the) ([a-z][a-z -]+?)(?:\s*\([^)]*\))? of the same level\b/i,
  /\b(?:knows? the same number of spells and receives? the same number of spells? slots per day) as (?:an?|the) ([a-z][a-z -]+?)(?:\s*\([^)]*\))? of (?:his|her|their|its|the) [^.]*?level\b/i,
  /\busing the spells known and spells per day from (?:the )?([a-z][a-z -]+?) progression table\b/i,
];
const spellListRule = /\b(?:casts?(?: arcane| divine| psychic)? spells (?:(?:spontaneously|drawn) )?from|prepares? spells from) the ([a-z]+(?:[ /-][a-z]+){0,2}?) (?:spell )?list\b/i;
const directAbilityRule = new RegExp(
  `\\bmust have (?:an? )?${abilityPattern} score[\\s\\S]{0,500}?\\b(?:saving throw )?DC[\\s\\S]{0,220}?\\1 modifier\\b`,
  "i",
);
const completeProfileArchetypeIds = new Set([
  "bard-speaker-of-the-palatine-eye",
  "investigator-questioner",
  "magus-eldritch-scion",
  "magus-mindblade",
]);

function spellcastingMinimumLevel(summary) {
  return Number(summary.match(/^At (\d+)(?:st|nd|rd|th)? level,[^.]{0,180}\b(?:gains? (?:a )?(?:different sort of )?spellcasting|begins? (?:to )?cast|casts? spells?)\b/i)?.[1] ?? 1);
}

function explicitlyChangesSpellcasting(trailingText) {
  return /\bkey spellcasting ability(?: score)?\b/i.test(trailingText)
    || /\bincluding (?:her |his |their )?spellcasting\b/i.test(trailingText)
    || (/\bbonus spells per day\b/i.test(trailingText) && /\bsave DCs? (?:of|for) (?:her |his |their )?spells\b/i.test(trailingText))
    || /\bspells per day, DCs, and other factors related to spellcasting\b/i.test(trailingText);
}

export function inferredArchetypeSpellcastingAbilityDetails(archetype) {
  let details;
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    const match = summary.match(spellcastingRule);
    if (match && explicitlyChangesSpellcasting(match[3])) details = {
      ...details,
      ability: normalizedAbility(match[1]),
      replacesAbility: normalizedAbility(match[2]),
      sourceFeatureId: feature.id,
    };
    const directAbility = summary.match(directAbilityRule);
    if (directAbility) details = {
      ...details,
      ability: normalizedAbility(directAbility[1]),
      directAbility: true,
      sourceFeatureId: feature.id,
    };
    const progression = progressionRules.map((rule) => summary.match(rule)).find(Boolean);
    const spellList = summary.match(spellListRule);
    const castingType = /\bcasts? (?:arcane |divine |psychic )?spells spontaneously\b/i.test(summary) || /\bcan cast any spell (?:he|she|they) knows? without preparing it ahead of time\b/i.test(summary)
      ? "spontaneous"
      : /\bmust prepare (?:his|her|their) spells ahead of time\b/i.test(summary)
        ? "prepared"
        : undefined;
    const tradition = summary.match(/\bcasts? (?:spells?[^.]{0,100}? as |)(arcane|divine|psychic) spells\b/i)?.[1]?.toLowerCase()
      ?? summary.match(/\bspells are considered (arcane|divine|psychic) spells\b/i)?.[1]?.toLowerCase();
    if (progression || spellList || castingType || tradition) details = {
      ...details,
      ...(progression ? {
        progressionClassId: normalizedClassId(progression[1]),
        minimumLevel: /\busing the spells known and spells per day from\b/i.test(progression[0])
          ? feature.level ?? 1
          : spellcastingMinimumLevel(summary),
      } : {}),
      ...(spellList ? { spellListClassId: normalizedClassId(spellList[1]) } : {}),
      ...(castingType ? { castingType } : {}),
      ...(tradition ? { tradition } : {}),
      sourceFeatureId: feature.id,
    };
    if (match || directAbility || progression || spellList || castingType || tradition) {
      const sentences = String(feature.summary ?? "").split(/(?<=[.!?])\s+/);
      for (const [sentenceIndex, sentence] of sentences.entries()) {
        if (spellcastingRule.test(sentence) || directAbilityRule.test(sentence) || progressionRules.some((rule) => rule.test(sentence)) || spellListRule.test(sentence) ||
          /\bcasts? (?:arcane |divine |psychic )?spells spontaneously\b/i.test(sentence) ||
          /\bcan cast any spell (?:he|she|they) knows? without preparing it ahead of time\b/i.test(sentence) ||
          /\bmust prepare (?:his|her|their) spells ahead of time\b/i.test(sentence) ||
          /\bcasts? (?:spells?[^.]{0,100}? as |)(?:arcane|divine|psychic) spells\b/i.test(sentence) ||
          /\bspells are considered (?:arcane|divine|psychic) spells\b/i.test(sentence))
          sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
      }
    }
    if (completeProfileArchetypeIds.has(archetype?.id) && /^Spells$/i.test(feature.name ?? "")) fullyAutomatedFeatureIds.add(feature.id);
  }
  return details ? { ...details, fullyAutomatedFeatureIds, sentenceCoverage } : undefined;
}

export function inferArchetypeSpellcastingAbility(archetype) {
  return inferredArchetypeSpellcastingAbilityDetails(archetype)?.ability;
}

export function inferArchetypeSpellcastingProgression(archetype) {
  const details = inferredArchetypeSpellcastingAbilityDetails(archetype);
  if (!details?.progressionClassId) return undefined;
  return {
    classId: details.progressionClassId,
    minimumLevel: details.minimumLevel ?? 1,
    ...(details.spellListClassId ? { spellListClassId: details.spellListClassId } : {}),
  };
}

export function inferArchetypeSpellcastingProfile(archetype) {
  const details = inferredArchetypeSpellcastingAbilityDetails(archetype);
  if (!details) return undefined;
  return {
    ...(details.ability ? { ability: details.ability } : {}),
    ...(details.progressionClassId ? { progressionClassId: details.progressionClassId } : {}),
    ...(details.spellListClassId ? { spellListClassId: details.spellListClassId } : {}),
    ...(details.minimumLevel ? { minimumLevel: details.minimumLevel } : {}),
    ...(details.castingType ? { castingType: details.castingType } : {}),
    ...(details.tradition ? { tradition: details.tradition } : {}),
  };
}

export function inferredArchetypeSpellcastingRemovalDetails(archetype) {
  const rules = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ").trim();
    const removesSpellcasting = /\bdoes not gain access to (?:divine )?spellcasting\b/i.test(summary)
      || (/\bdoes not gain access to [a-z]+ spells\b/i.test(summary)
        && /\bdoes not have an? [a-z]+ caster level or spell list\b/i.test(summary));
    if (!removesSpellcasting) continue;
    rules.push({ sourceFeatureId: feature.id, removesSpellcasting: true });
    if (/^A [^.]+ does not gain access to [a-z]+ spells, and does not have an? [a-z]+ caster level or spell list\. This is not considered a spellcasting class\.$/i.test(summary))
      fullyAutomatedFeatureIds.add(feature.id);
  }
  return { rules, fullyAutomatedFeatureIds };
}

export function inferArchetypeRemovesSpellcasting(archetype) {
  return inferredArchetypeSpellcastingRemovalDetails(archetype).rules.some((rule) => rule.removesSpellcasting);
}
