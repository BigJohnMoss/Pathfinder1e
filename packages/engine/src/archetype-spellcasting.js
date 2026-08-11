const abilityPattern = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";

const spellcastingRule = new RegExp(
  `\\buses?\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?\\s+instead of\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?([^.]*)`,
  "i",
);

const normalizedAbility = (value) => String(value ?? "").toLowerCase();
const normalizedClassId = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const progressionRule = /\b(?:same number of spell slots per day|same number of spells known and spells per day) as (?:an?|the) ([a-z][a-z -]+?)(?:\s*\([^)]*\))? of (?:his|her|their|its|the) [^.]*?level\b/i;
const spellListRule = /\b(?:casts?(?: arcane| divine| psychic)? spells (?:(?:spontaneously|drawn) )?from|prepares? spells from) the ([a-z][a-z -]+?) spell list\b/i;

function explicitlyChangesSpellcasting(trailingText) {
  return /\bkey spellcasting ability(?: score)?\b/i.test(trailingText)
    || /\bincluding (?:her |his |their )?spellcasting\b/i.test(trailingText)
    || (/\bbonus spells per day\b/i.test(trailingText) && /\bsave DCs? (?:of|for) (?:her |his |their )?spells\b/i.test(trailingText))
    || /\bspells per day, DCs, and other factors related to spellcasting\b/i.test(trailingText);
}

export function inferredArchetypeSpellcastingAbilityDetails(archetype) {
  let details;
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    const match = summary.match(spellcastingRule);
    if (match && explicitlyChangesSpellcasting(match[3])) details = {
      ...details,
      ability: normalizedAbility(match[1]),
      replacesAbility: normalizedAbility(match[2]),
      sourceFeatureId: feature.id,
    };
    const progression = summary.match(progressionRule);
    const spellList = summary.match(spellListRule);
    if (progression || spellList) details = {
      ...details,
      ...(progression ? {
        progressionClassId: normalizedClassId(progression[1]),
        minimumLevel: feature.level,
      } : {}),
      ...(spellList ? { spellListClassId: normalizedClassId(spellList[1]) } : {}),
      sourceFeatureId: feature.id,
    };
  }
  return details;
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
